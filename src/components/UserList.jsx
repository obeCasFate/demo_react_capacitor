import { useState, useEffect } from "react";
import sqliteService from "../services/sqliteService";
import authService from "../services/authService";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL2 || "http://10.0.2.2:8000";
const apiUrl = `${apiBaseUrl}/api/users`;

const UserList = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncStats, setSyncStats] = useState({});

  // IndexedDB からユーザーを読み込む
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const allUsers = await sqliteService.getAllUsers();
      setUsers(allUsers);

      // 同期統計を取得
      const stats = await sqliteService.getSyncStats();
      setSyncStats(stats);
      setLastSync(stats.lastSync ? stats.lastSync.toISOString() : null);
    } catch (err) {
      setError(
        "ローカルストレージからユーザーの読み込みに失敗しました: " + err.message
      );
      console.error("Error loading users", err);
    } finally {
      setLoading(false);
    }
  };

  /* ユーザーデータを同期処理（認証付きAPI）*/
  const syncUsers = async () => {
    try {
      setSyncing(true);
      setError(null);

      // Check authentication before sync
      if (!authService.isAuthenticated()) {
        throw new Error("認証が必要です。再ログインしてください。");
      }

      console.log("Syncing from URL: ", apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: authService.getAuthHeader(),
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      console.log("📥 Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const users = await response.json();

      // Save to SQLite
      await sqliteService.saveUsers(users);
      await sqliteService.updateSyncMetadata(
        "last_sync",
        new Date().toISOString()
      );
      await sqliteService.updateSyncMetadata("last_sync_count", users.length);

      // 同期後にユーザーを再読み込み
      await loadUsers();

      console.log(`✅ ユーザー同期が完了しました (${users.length}人)`);
    } catch (err) {
      console.error("Error syncing users:", err);

      // Handle specific authentication errors
      if (err.message.includes("認証") || err.message.includes("401")) {
        setError(
          "認証が期限切れです。ページを更新してログインし直してください。"
        );
      } else {
        setError("サーバーからのユーザー同期に失敗しました: オフライン中 ");
        console.log(err);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Test authentication and connection - improved version
  const testConnection = async () => {
    try {
      // Check auth status first
      if (!authService.isAuthenticated()) {
        alert("❌ 認証されていません");
        return;
      }

      // Use the improved test method from sqliteService2
      const result = await sqliteService.testConnection();

      if (result.success) {
        alert(`✅ サーバーAPI接続成功！`);
      } else {
        alert(`❌ API接続失敗: オフライン中`);
      }
    } catch (error) {
      alert(`❌ 接続テストエラー: ${error.message}`);
    }
  };

  // コンポーネントのマウント時に自動同期を実行する
  useEffect(() => {
    const initializeUsers = async () => {
      try {
        // まずローカルデータを読み込む
        await loadUsers();

        // 認証されている場合のみ同期を試行
        if (authService.isAuthenticated()) {
          // 同期が必要かどうか（5分経過で）確認
          const needsSync = await sqliteService.isSyncNeeded(5);

          if (needsSync) {
            console.log("🔄 自動同期を開始します...");
            await syncUsers();
          } else {
            console.log("📊 同期は不要です（5分以内に同期済み）");
          }
        } else {
          console.log("⚠️ 認証されていないため同期をスキップします");
        }
      } catch (err) {
        console.error("Error initializing users:", err);
        // 同期に失敗した場合でもローカルデータは表示
        setError("初期化中にエラーが発生しました: " + err.message);
      }
    };

    initializeUsers();
  }, []);

  /**
   * Format datetime to display
   */
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid Date";
    }
  };

  // Clear error message manually
  const clearError = () => setError(null);

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">ユーザーを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className=" w-[75%] mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ユーザー管理
          </h2>
          {user && (
            <p className="text-sm text-gray-600">ログイン中: {user.email}</p>
          )}
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          {lastSync && (
            <span className="text-sm text-gray-500">
              前回の同期: {formatDateTime(lastSync)}
            </span>
          )}

          {/* Debug/Test button */}
          <button
            onClick={testConnection}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"
          >
            接続テスト
          </button>

          {/* Sync button */}
          <button
            onClick={syncUsers}
            disabled={syncing || !authService.isAuthenticated()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>同期中...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>同期</span>
              </>
            )}
          </button>
        </div>
      </div>
      {/* Authentication Status Alert */}
      {!authService.isAuthenticated() && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            ⚠️
            認証が必要です。最新のユーザーデータを取得するには認証してください。
          </p>
        </div>
      )}
      {/* Error message with dismiss button */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex justify-between items-start">
            <p className="text-red-700 flex-1">{error}</p>
            <button
              onClick={clearError}
              className="ml-3 text-red-400 hover:text-red-600"
              aria-label="エラーを閉じる"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
      {/* User count and sync info */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          総ユーザー数: <span className="font-semibold">{users.length}</span>
          {users.length > 0 && (
            <>
              <span className="ml-4">
                (
                {authService.isAuthenticated()
                  ? "オンライン同期可能"
                  : "オフラインデータ"}
                )
              </span>
              {syncStats.lastSyncCount && (
                <span className="ml-2 text-gray-500">
                  • 前回同期: {syncStats.lastSyncCount}人
                </span>
              )}
            </>
          )}
        </p>
      </div>
      {/* Users Table */} {/* overflow-y-auto <- Create vertical scroll */}
      <div className="overflow-auto w-full h-[77%] border border-gray-200 rounded-lg">
        <table className="min-w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                連絡先
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                組織
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最終ログイン
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((userData) => (
              <tr key={userData.id} className="hover:bg-gray-50 ">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 relative">
                      {userData.profile_image ? (
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={userData.profile_image}
                          alt={userData.username || "User"}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold"
                        style={{
                          display: userData.profile_image ? "none" : "flex",
                        }}
                      >
                        {userData.first_name?.[0] ||
                          userData.last_name?.[0] ||
                          userData.username?.[0] ||
                          userData.email?.[0] ||
                          "?"}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {userData.first_name && userData.last_name
                          ? `${userData.last_name} ${userData.first_name}`
                          : userData.username ||
                            userData.email ||
                            "不明なユーザー"}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{userData.username || "ユーザー名なし"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {userData.email || "N/A"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {userData.phone || "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {userData.organization || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDateTime(userData.last_login_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Empty State */}
      {users.length === 0 && !loading && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            ユーザーが見つかりません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {authService.isAuthenticated()
              ? "「同期」ボタンをクリックしてサーバーからユーザーを読み込んでください。"
              : "認証してからユーザーデータを同期してください。"}
          </p>
          {authService.isAuthenticated() && (
            <button
              onClick={syncUsers}
              disabled={syncing}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {syncing ? "同期中..." : "今すぐ同期"}
            </button>
          )}
        </div>
      )}
      {/* Footer Info */}
      {users.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500 text-center">
            {authService.isAuthenticated()
              ? `認証済み - データベースから${users.length}人のユーザーを表示中`
              : `オフラインモード - ローカルに保存された${users.length}人のユーザーを表示中`}
            {syncStats.lastSync && (
              <span className="block mt-1">
                最終同期: {formatDateTime(syncStats.lastSync.toISOString())}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
