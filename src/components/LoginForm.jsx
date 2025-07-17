import React, { useEffect, useState } from "react";
import authService from "../services/authService";

const LoginForm = ({ onLoginSuccess, message }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Check server connectivity on component mount
  useEffect(() => {
    checkServerConnection();
    const interval = setInterval(checkServerConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkServerConnection = async () => {
    try {
      const isConnected = await authService.checkServerConnection();
      setConnectionStatus(isConnected ? "online" : "offline");
      setIsOfflineMode(!isConnected);
    } catch (error) {
      setConnectionStatus("offline");
      setIsOfflineMode(true);
      console.log(error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await authService.login(formData.email, formData.password);
      console.log("ログイン成功:", result);

      // Show success message based on mode
      if (result.mode === "offline") {
        console.log("オフラインモードでログインしました");
      } else {
        console.log("オンラインモードでログインしました");
      }

      onLoginSuccess(result);
    } catch (err) {
      setError(err.message || "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case "online":
        return (
          <div className="flex items-center text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>オンライン</span>
          </div>
        );
      case "offline":
        return (
          <div className="flex items-center text-yellow-600">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            <span>オフライン</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-600">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2 animate-pulse"></div>
            <span>確認中</span>
          </div>
        );
    }
  };

  return (
    <div className="flex mt-8 ml-12 justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">ログイン</h2>
            {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
          </div>

          {/* Connection Status */}
          <div className="mt-3 flex justify-center">
            <div className="text-xs font-medium">
              {getConnectionStatusIcon()}
            </div>
          </div>

          {/* Offline Mode Notice */}
          {isOfflineMode && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 text-yellow-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <span className="text-sm text-yellow-800">
                  オフラインモード - 事前に同期されたデータを使用
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mt-2 block text-sm font-medium text-gray-700 mb-1"
              >
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@company.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                パスワード
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="パスワードを入力"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isOfflineMode ? "オフラインログイン中..." : "ログイン中..."}
                </div>
              ) : (
                <>
                  "ログイン"
                  {isOfflineMode && (
                    <span className="ml-2 text-xs bg-yellow-600 px-2 py-1 rounded">
                      オフライン
                    </span>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Development Test Account Info */}
          {import.meta.env.MODE === "development" && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-rose-800 mb-2">
                  開発用テストアカウント:
                </h4>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p>Email: kazuya.kudo@example.org</p>
                  <p>Password: password123</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      email: "kazuya.kudo@example.org",
                      password: "password123",
                    });
                  }}
                  className="mt-2 text-sm text-yellow-600 hover:text-yellow-800 underline"
                >
                  テストアカウントを自動入力
                </button>
              </div>
            </div>
          )}

          {/* Offline Mode Info */}
          {isOfflineMode && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="bg-blue-50 border-blue-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-gray-800 mb-2">
                  オフラインモードについて:
                </h4>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>・事前に同期されたユーザーデータを使用します</li>
                  <li>・オフライン有効ユーザーのみログイン可能です</li>
                  <li>・オンライン復旧時に自動で同期されます</li>
                </ul>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              アカウントに関する問題がある場合は、システム管理者にお問い合わせください。
            </p>

            {/* Retry Connection Button */}
            {isOfflineMode && (
              <button
                type="button"
                onClick={checkServerConnection}
                className="mt-2 text-sm text-gray-600 hover:text-gray-800 underline"
              >
                接続を再試行
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
