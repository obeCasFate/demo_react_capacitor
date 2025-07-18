// import { parseAst } from "vite";
import sqliteService from "./sqliteService.js";
import bcryptjs from "bcryptjs";

class AuthService {
  constructor() {
    this.apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL2 || "http://10.0.2.2:8000";
    this.token = "18|UWKlDGkSZ0PnBf0mIslZszWxx20SeoANdAW49DAd461e1496";
    this.currentUser = null;
    this.currentToken = null;
    this.offlineKey = false;
  }

  /**
   * オフラインモードかを判定
   */
  async isOfflineMode() {
    const offlineMode = await sqliteService.getSyncMetadata("offline_mode");
    return offlineMode === true;
  }

  /**
   * オフラインモードに切り替える
   */
  async setOfflineMode(isOffline) {
    await sqliteService.updateSyncMetadata(
      "offline_mode",
      isOffline.toISOString()
    );
  }

  async login(email, password) {
    try {
      // まずオンラインログインを試みる
      const result = await this.onlineLogin(email, password);

      if (result.success) {
        // ログイン成功（オンライン）
        this.setOfflineMode(false);
        return result;
      }
    } catch (error) {
      console.log(
        "🔄 オンラインログインエラー発生、オフラインログインへ切り替え中..."
      );
      try {
        const offlineResult = await this.offlineLogin(email, password);
        if (offlineResult.success) {
          this.setOfflineMode(true);
          return offlineResult;
        }
      } catch (offlineError) {
        console.error(
          "❌ オフラインログインもエラーが発生しました： ",
          offlineError
        );
      }
      // オンライン・オフライン両方の認証に失敗したら、オンラインのエラーを投げる
      throw error;
    }
  }

  /**
   * Online login via Laravel API
   */
  //
  async onlineLogin(email, password) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "ログインに失敗しました");
      }
      const data = await response.json();

      // トークンやユーザーデータをローカルに保存
      await this.storeAuthData(data.user, data.access_token);

      // ユーザーが存在する場合、IndexedDBの最終ログイン日時を更新
      await this.updateUserLastLoginOnline(data.user.id);

      console.log("✅ オンラインログイン成功");
      return {
        success: true,
        user: data.user,
        access_token: data.access_token,
        mode: "online",
      };
    } catch (error) {
      console.error("❌ オンラインログイン失敗：", error);
      throw error;
    }
  }

  async getOfflinAuthData(email) {
    try {
      console.log("🔍 Getting auth data for:", email);

      const db = await sqliteService.initDB();
      const tx = db.transaction(["offline_auth"], "readonly");
      const authStore = tx.objectStore("offline_auth");

      const allAuthData = await authStore.getAll();
      console.log(`📊 Total auth entries: ${allAuthData.length}`);

      if (allAuthData.length > 0) {
        console.log(
          "📧 Sample emails in store:",
          allAuthData.slice(0, 3).map((a) => a.email)
        );
      }

      const authData = allAuthData.find((auth) => {
        return auth.email === email;
      });

      if (authData) {
        console.log("✅ Found matching auth data:", {
          user_id: authData.user_id,
          email: authData.email,
          has_hash: !!authData.password_hash,
          hash_starts: authData.password_hash?.substring(0, 4),
        });
      } else {
        console.log("❌ No matching auth data found");
        console.log(
          "Available emails:",
          allAuthData.map((a) => a.email)
        );
      }
      return authData || null;
    } catch (error) {
      console.error("❌ Error getting auth data:", error);
      return null;
    }
  }

  /**
   * SQLite経由のオフライン認証
   */
  async offlineLogin(email, password) {
    try {
      console.log("🔄 オフラインモードでログイン中…");

      // SQliteからユーザーを取得する
      const user = await sqliteService.getUserByEmail(email);

      if (!user) {
        throw new Error(
          "ユーザーが見つかりません。オンラインでログインしてください。"
        );
      }

      // Check if user has offline enabled
      if (!user.offline_enabled) {
        throw new Error("このユーザーはオフラインログインが無効です");
      }

      // 簡易チェック（実際のアプリではハッシュ化されたパスワードを比較する必要があります）
      const isValidPassword = await this.validateOfflinePassword(
        user,
        password
      );

      if (!isValidPassword) {
        throw new Error("パスワードが間違っています。");
      }

      //   // オフライントークン生成
      //   const offlineToken = this.generateOfflineToken(user);

      //   // トークンやユーザーデータをローカルに保存 (オフライン)
      const offlineToken = this.generateOfflineToken(user);
      await this.storeAuthData(user, offlineToken);
      await this.updateOfflineUserStats(user.id);

      // ユーザーが存在する場合、IndexedDBの最終ログイン日時を更新(オフライン)
      console.log("✅ オフラインログイン成功(SQLite) ");
      return {
        success: true,
        user: user,
        access_token: offlineToken,
        mode: "offline",
      };
    } catch (error) {
      console.error("❌ オフラインログイン失敗:", error);
      throw error;
    }
  }

  /**
   * オフラインログインのためのパスワード検証
   * 注意：本番環境ではパスワードはハッシュ化して保存し、適切に検証する必要があります
   */
  async validateOfflinePassword(user, password) {
    console.log("🔍 Simple offline validation:");
    console.log("User:", user.email);
    console.log("Password entered:", password);
    console.log("User offline_enabled:", user.offline_enabled);

    // 簡易的な検証 - 本番環境では適切なパスワードハッシュ化を使用してください
    // サーバーから同期するときにパスワードのハッシュを保存することがあります
    // デモ用として簡単なチェックを行います
    // 実装時には保存されたハッシュと照合してください
    const storedPasswordHash = user.password_hash || user.hashed_password;

    if (!storedPasswordHash) {
      // ハッシュが存在しない場合は、オフラインログインを拒否
      console.log("❌ No password hash found in SQLite");
      return false;
    }

    console.log("Original hash:", storedPasswordHash.substring(0, 10) + "...");

    try {
      let hashToCheck = storedPasswordHash;

      // ✅ FIX: Convert Laravel $2y$ to bcrypt.js compatible $2a$
      if (storedPasswordHash.startsWith("$2y$")) {
        hashToCheck = storedPasswordHash.replace("$2y$", "$2a$");
        console.log("🔄 Converted Laravel hash format $2y$ → $2a$");
      }

      console.log("🔐 Comparing password with hash...");
      const isValid = await bcryptjs.compare(password, hashToCheck);
      console.log(`🔐 Password validation result: ${isValid}`);
      return isValid;
    } catch (error) {
      console.log("❌ Password validation error:", error);
      return false;
    }
  }

  /**
   * 簡易的なパスワード比較（本番環境ではbcryptなどに置き換えてください）
   */
  async comparePassword(password, hash) {
    // これは仮の実装です - 適切なパスワードハッシュライブラリを使用してください
    // デモ用として簡単なチェックを行います
    return password === "password123" || password === hash;
  }

  /**
   * オフライン用トークンを生成・発行
   */
  generateOfflineToken(user) {
    const timestamp = Date.now();
    const payload = {
      user_id: user.id,
      email: user.email,
      timestamp: timestamp,
      mode: "offline",
    };

    // 簡易的なトークン生成 - 本番環境では適切なJWTを使用してください
    return `offline_${btoa(JSON.stringify(payload))}`;
  }

  async storeAuthData(user, token) {
    try {
      // 現在のユーザーIDを保存
      await sqliteService.updateSyncMetadata(
        "current_user_id",
        user.id.toString()
      );

      // SQLite上でトークンを保存
      await sqliteService.saveAuthToken(user.id, token);

      // メモリにも保存 class
      this.currentUser = user;
      this.currentToken = token;

      console.log("✅ 認証データをSQLiteに保存しました");
    } catch (error) {
      console.log("❌ 認証データ保存エラー:", error);
      throw error;
    }
  }

  /**
   * IndexedDBでユーザーの最終ログイン情報を更新 (オンライン時)
   */
  async updateUserLastLoginOnline(userID) {
    try {
      const user = await sqliteService.getUserByID(userID);
      if (user) {
        user.last_login_at = new Date().toISOString();
        await sqliteService.updateUser(user);
        console.log("📝 IndexedDB内のユーザー最終ログイン日時を更新済み");
      }
    } catch (error) {
      console.log("❌ 最終ログイン日時の更新エラー：", error);
    }
  }

  /**
   * オフライン時のユーザーログイン情報を更新
   */
  async updateOfflineUserStats(userID) {
    try {
      const user = await sqliteService.getUserById(userID);
      if (user) {
        user.last_login_at = new Date().toISOString();
        user.login_count = (user.login_count || 0) + 1;

        // IndexedDB更新
        const db = await sqliteService.initDB();
        await db.put("users", user);
        console.log("📝 オフラインログイン情報を更新しました");
      }
    } catch (error) {
      console.error("❌ ユーザーオフライン情報の更新エラー:", error);
    }
  }

  async logout() {
    try {
      // オンラインの場合はサーバーに通知
      const isOffline = await this.isOfflineMode();
      if (!isOffline && this.currentToken) {
        try {
          await this.authenticatedFetch(`${this.apiBaseUrl}/api/logout`, {
            method: "POST",
          });
        } catch (error) {
          console.log(
            "🔄 サーバーログアウト失敗。ローカルログアウトを継続中: ",
            error
          );
        }
      }

      // SQLiteから認証情報クリア
      await sqliteService.updateSyncMetadata("current_user_id", "");
      await sqliteService.updateSyncMetadata("offline_mode", "false");

      // メモリもクリア
      this.currentUser = null;
      this.currentToken = null;
      this.isOffline = false;

      console.log("✅ ログアウト完了");
    } catch (error) {
      console.error("❌ ログアウトエラーが発生:", error);
      // エラー発生時でも強制クリアを試みる
      this.currentUser = null;
      this.currentToken = null;
    }
  }

  async getCurrentUser() {
    // メモリにユーザーがある場合はそれを返す
    if (this.currentUser) {
      return this.currentUser;
    }

    // SQLiteから現在のユーザーIDを取得
    const userID = await sqliteService.getSyncMetadata("current_user_id");
    if (!userID) return null;

    const user = await sqliteService.getUserByID(parseInt(userID));
    if (!user) return null;

    // オンライン接続時はサーバー側でトークンを認証する
    const isOffline = await this.isOfflineMode();
    if (!isOffline) {
      try {
        const response = await this.authenticatedFetch(
          `${this.apiBaseUrl}/api/me`
        );
        if (response.ok) {
          const serverUser = await response.json();

          // サーバーのデータでローカルを更新
          await sqliteService.saveUsers([serverUser]);
          this.currentUser = serverUser;
          return serverUser;
        }
      } catch (error) {
        console.log(
          "🔄 サーバー検証に失敗しました。キャッシュされたユーザー情報を使用します: ",
          error
        );
      }
    }
    this.currentUser = user;
    return user;
  }

  async getAuthHeader() {
    if (this.currentToken) {
      return `Bearer ${this.currentToken}`;
    }
    // SQLiteからトークンを取得
    const userID = await sqliteService.getSyncMetadata("current_user_id");
    if (!userID) return null;

    const tokenData = await sqliteService.getValidAuthToken(parent(userID));
    if (tokenData) {
      this.currentToken = tokenData.token;
      return `Bearer ${tokenData.token}`;
    }
    return null;
  }

  /**
   *
   * ユーザーが認証済みかどうかを確認（オンライン・オフライン両方対応）
   */
  async isAuthenticated() {
    const userID = await sqliteService.getSyncMetadata("current_user_id");
    if (!userID) return false;

    const tokenData = await sqliteService.getValidAuthToken(parseInt(userID));
    return !!tokenData;
  }

  getUser() {
    return this.user;
  }

  storeToken(token) {
    try {
      localStorage.setItem("auth_token", token);
    } catch (error) {
      console.error("Failed to store token:", error);
    }
  }

  storeUser(user) {
    try {
      localStorage.setItem("user_data", JSON.stringify(user));
    } catch (error) {
      console.error("Failed to store user data:", error);
    }
  }

  getStoredToken() {
    return localStorage.getItem("auth_token");
  }

  getStoredUser() {
    const userData = localStorage.getItem("user_data");
    return userData ? JSON.parse(userData) : null;
  }

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
  }

  // Check authenticated Status
  async checkAuthStatus() {
    if (!this.isAuthenticated()) {
      return { isAuthenticated: false, user: null };
    }

    try {
      const user = await this.getCurrentUser();
      return { isAuthenticated: true, user };
    } catch (error) {
      console.log("Authorization status error:", error);
      return { isAuthenticated: false, user: null };
    }
  }

  // Make authenticated API calls
  async authenticatedFetch(url, options = {}) {
    const authHeader = this.getAuthHeader();
    console.log(`Header is generated ${authHeader}`);

    if (!authHeader) {
      throw new Error("認証用のトークンが見つかりません");
    }

    const defaultOptions = {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {}),
      },
    };
    return fetch(url, mergedOptions);
  }
  //   // まず、XSRF-TOKEN を Cookie から取り出す
  //   getCookie(name) {
  //     const value = `; ${document.cookie}`;
  //     const parts = value.split(`; ${name}=`);
  //     if (parts.length === 2) return parts.pop().split(';').shift();
  //     }

  /**
   * 接続復旧時にユーザーデータを同期
   */
  async syncWhenOnline() {
    try {
      const isOffline = await this.isOfflineMode();
      const isAuth = await this.isAuthenticated();

      if (isOffline && isAuth) {
        console.log("🔄 オフラインモード終了後にデータ同期を実行中…");
        // サーバーで再認証を試みる
        const isConnected = await this.checkServerConnection();
        if (isConnected) {
          // これにはパスワードが必要ですが、保存していません
          // 代替案：トークンのリフレッシュ機能やサーバー側の同期処理を実装してください
          await this.setOfflineMode(false);
          console.log("ℹ️ オフラインモード終了後は手動で再認証が必要です");
        }
      }
    } catch (error) {
      console.log("❌ 同期エラー：", error);
    }
  }

  /**
   *
   * サーバーとの接続をチェック
   */
  async checkServerConnection() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/health`, {
        methos: "GET",
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      console.log(`❌ サーバー接続確認エラー: ${error}`);
      return false;
    }
  }
}

export default new AuthService();
