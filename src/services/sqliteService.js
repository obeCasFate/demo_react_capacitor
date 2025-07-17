import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";

class SQLiteService {
  constructor() {
    this.db = null;
    this.sqlite = null;
    this.dbName = "UserManagementDB"; // localStorage key for database
    this.isInitialized = false;
    this.initPromise = null;
  }

  async initDB() {
    // If already initialized, return the db
    if (this.isInitialized && this.db) {
      return this.db;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this._performInit();

    try {
      const db = await this.initPromise;
      return db;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  async _performInit() {
    try {
      console.log("🔧 Capacitor SQLiteを初期化しています...");

      // Check platform first
      if (!Capacitor.isNativePlatform()) {
        throw new Error("SQLite is only available on native platforms");
      }

      this.sqlite = new SQLiteConnection(CapacitorSQLite);

      // Add delay to ensure Capacitor is ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const ret = await this.sqlite.checkConnectionsConsistency();
        const isConn = (await this.sqlite.isConnection(this.dbName, false))
          .result;

        if (ret.result && isConn) {
          this.db = await this.sqlite.retrieveConnection(this.dbName, false);
        } else {
          this.db = await this.sqlite.createConnection(
            this.dbName,
            false,
            "no-encryption",
            1,
            false
          );
        }
      } catch (connectionError) {
        // If connection check fails, create new connection
        console.log("Creating new connection due to:", connectionError);
        this.db = await this.sqlite.createConnection(
          this.dbName,
          false,
          "no-encryption",
          1,
          false
        );
      }

      await this.db.open();
      await this.createTables();
      this.isInitialized = true;

      console.log("✅ Android SQLiteの初期化に成功しました");
      return this.db;
    } catch (error) {
      console.error("❌ SQLite初期化エラー:", error);
      this.db = null;
      this.isInitialized = false;
      throw error;
    }
  }

  async createTables() {
    const createTablesSQL = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                username TEXT,
                email TEXT UNIQUE,
                organization TEXT,
                password_hash TEXT,
                offline_enabled INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT,
                last_login_at TEXT,
                last_sync_at TEXT
            );
            
            CREATE TABLE IF NOT EXISTS sync_metadata (
                key TEXT PRIMARY KEY,
                value TEXT,
                timestamp TEXT 
            );

            CREATE TABLE IF NOT EXISTS auth_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                token TEXT,
                token_type TEXT,
                expires_at TEXT,
                created_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );
        `;
    try {
      const result = await this.db.execute(createTablesSQL);
      console.log("✅ テーブルが作成されました", result);
    } catch (error) {
      console.error("❌ テーブル作成エラー:", error);
      throw error;
    }
  }

  async saveUsers(users) {
    if (!this.db) await this.initDB();

    console.log(
      `🔄 ${users.length}人のユーザーをCapacitor SQLiteに保存しています...`
    );

    try {
      // まず、ローカルのusersテーブルを削除
      // 外部キー順序に従ってauth_tokensを先に消す
      await this.db.run("DELETE FROM auth_tokens");
      await this.db.run("DELETE FROM users");

      // Batch Operations
      const insertStatements = users.map((user) => ({
        statement: `
            INSERT INTO users 
            (id, username, email, organization, password_hash, offline_enabled, created_at, updated_at, last_login_at, last_sync_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,

        values: [
          user.id,
          user.username,
          user.email,
          user.organization,
          user.password_hash,
          user.offline_enabled ? 1 : 0,
          user.created_at || new Date().toISOString(),
          user.updated_at || new Date().toISOString(),
          user.last_login_at || null,
          user.last_sync_at || new Date().toISOString(),
        ],
      }));

      const result = await this.db.executeSet(insertStatements);
      console.log(result);

      console.log(
        `Capacitor SQLiteに${users.length}人のユーザーを保存しました`
      );
      return { success: true, inserted: users.length };
    } catch (error) {
      console.error(`❌ ユーザーの保存中にエラーが発生しました： ${error}`);
      throw error;
    }
  }

  async getUserByEmail(email) {
    await this.initDB();

    try {
      const result = await this.db.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (result.values && result.values.length > 0) {
        return result.values[0];
      }

      return null;
    } catch (error) {
      console.log(
        "❌ メールアドレスによるユーザーの取得中にエラーが発生しました：",
        error
      );
      return null;
    }
  }

  async getAllUsers() {
    await this.initDB();
    try {
      const result = await this.db.query(
        "SELECT * FROM users ORDER BY created_at DESC"
      );
      return result.values || [];
    } catch (error) {
      console.error("ユーザー一覧の取得エラー： ", error);
      return [];
    }
  }

  async getUserByID(id) {
    await this.initDB();

    try {
      const result = await this.db.query("SELECT * FROM users WHERE id = ?", [
        id,
      ]);
      if (result.values && result.values.length > 0) {
        return result.values[0];
      }
      return null;
    } catch (error) {
      console.error("❌ ID指定のユーザー取得エラー: ", error);
      return null;
    }
  }

  async updateUser(user) {
    await this.initDB();
    try {
      const result = await this.db.run(
        `UPDATE users SET 
          username = ?, 
          organization = ?, 
          offline_enabled = ?, 
          updated_at = ?, 
          last_login_at = ?, 
          last_sync_at = ?
        WHERE id = ?`,
        [
          user.username,
          user.organization,
          user.offline_enabled ? 1 : 0,
          new Date().toISOString(),
          user.last_login_at,
          user.last_sync_at,
          user.id,
        ]
      );

      console.log("✅ ユーザー情報を更新しました");
      return result;
    } catch (error) {
      console.error("❌ 同期メタデータの更新エラー： ", error);
      throw error;
    }
  }

  async updateSyncMetadata(key, value) {
    await this.initDB();
    try {
      await this.db.run(
        " INSERT OR REPLACE INTO sync_metadata (key, value, timestamp) VALUES (?, ?, ?)",
        [key, value, new Date().toISOString()]
      );

      console.log(`📝 同期情報を更新：${key} = ${value}`);
    } catch (error) {
      console.error("❌ 同期メタデータの更新エラー： ", error);
      throw error;
    }
  }

  async getSyncMetadata(key) {
    await this.initDB();

    try {
      const result = await this.db.query(
        "SELECT value FROM sync_metadata WHERE key = ?",
        [key]
      );

      if (result.values && result.values.length > 0) {
        return result.values[0].value;
      }

      return null;
    } catch (error) {
      console.error("❌ 同期メタデータの取得に失敗: ", error);
      return null;
    }
  }

  async saveAuthToken(userID, token, tokenType = "bearer", expiresIn = 86400) {
    if (!this.db) await this.initDB();

    try {
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      await this.db.run(
        `INSERT INTO auth_tokens (user_id, token, token_type, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [userID, token, tokenType, expiresAt, new Date().toISOString()]
      );
      console.log("✅ 認証トークンを保存しました");
    } catch (error) {
      console.error("❌ トークン保存エラー: ", error);
      throw error;
    }
  }

  async getValidAuthToken(userID) {
    if (!this.db) await this.initDB();

    try {
      const now = new Date().toISOString();
      const result = await this.db.query(
        `SELECT * FROM auth_tokens
         WHERE user_id = ? AND expires_at > ?
         ORDER BY created_at DESC LIMIT 1`,
        [userID, now]
      );
      if (result.values && result.values.length > 0) {
        return result.values[0];
      }

      return null;
    } catch (error) {
      console.error("❌ トークン取得エラー:", error);
      return null;
    }
  }

  async clearExpiredTokens() {
    if (!this.db) await this.initDB();

    try {
      const now = new Date().toISOString();
      await this.db.run("DELETE FROM auth_tokens WHERE expires_at < ?", [now]);
      console.log("✅ 期限切れトークンを削除しました");
    } catch (error) {
      console.log("❌ トークンクリアエラー: ", error);
    }
  }

  async clearAllData() {
    await this.initDB();

    try {
      await this.db.executeSet([
        { statement: "DELETE FROM auth_tokens", values: [] },
        { statement: "DELETE FROM users", values: [] },
        { statement: "DELETE FROM sync_metadata", values: [] },
      ]);
      console.log("Capacitor SQLiteの全データが削除されました");
    } catch (error) {
      console.log("❌ データ消去エラー: ", error);
      throw error;
    }
  }

  // ✅ Add methods for sync compatibility
  async getSyncStats() {
    try {
      const lastSync = await this.getSyncMetadata("last_sync");
      const lastCount = await this.getSyncMetadata("last_sync_count");
      const userCount = (await this.getAllUsers()).length;

      return {
        lastSync: lastSync ? new Date(lastSync) : null,
        lastSyncCount: parseInt(lastCount) || 0,
        currentUserCount: userCount,
        isAuthenticated: await this.hasValidSession(), // You'll need to implement this
      };
    } catch (error) {
      console.error("❌ Error getting sync stats:", error);
      return {
        lastSync: null,
        lastSyncCount: 0,
        currentUserCount: 0,
        isAuthenticated: false,
      };
    }
  }

  async hasValidSession() {
    try {
      const currentUserID = await this.getSyncMetadata("current_user_id");
      if (!currentUserID) return false;

      // If token exists (has any truthy value like a string), return true
      const token = await this.getValidAuthToken(parseInt(currentUserID));
      return !!token;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  async isSyncNeeded(maxAgeMinutes = 5) {
    try {
      const lastSync = await this.getSyncMetadata("last_sync");
      if (!lastSync) {
        console.log("🔄 No previous sync found, sync needed");
        return true;
      }

      const lastSyncTime = new Date(lastSync);
      const now = new Date();
      const diffMinutes = (now - lastSyncTime) / (1000 * 60);

      const needed = diffMinutes > maxAgeMinutes;
      console.log(
        `🕒 最終同期：${diffMinutes.toFixed(1)}分前、同期の必要性：${needed}`
      );

      return needed;
    } catch (error) {
      console.error("❌ Error checking sync status:", error);
      return true;
    }
  }

  // Add this method too:
  async testConnection() {
    try {
      console.log("🧪 Testing API connection...");

      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL2 || "http://localhost:8000";

      const response = await fetch(`${apiBaseUrl}/api/health`, {
        method: "GET",
        timeout: 5000,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ API connection successful");
        return {
          success: true,
          data,
          message: "API接続成功",
        };
      } else {
        console.log("❌ API connection failed:", response.status);
        return {
          success: false,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      console.log("❌ API connection error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async closeConnection() {
    if (this.db && this.sqlite) {
      try {
        await this.sqlite.closeConnection(this.dbName, false);
        console.log("✅ DB接続を終了");
      } catch (error) {
        console.log("❌ DB接続終了エラー:", error);
      }
    }
  }

  async debugDatabase() {
    try {
      console.log("🔍 Capacitor SQLite DBのデバッグログ");
      const users = await this.getAllUsers();
      console.log(`📊 登録ユーザー数：${users.length}`);

      if (users.length > 0) {
        console.log("👥 ユーザー例 (3件表示):", users.slice(0, 3));
      }

      const lastSync = await this.getSyncMetadata("last_sync");
      console.log("📅 最終同期：", lastSync);

      return {
        platform: Capacitor.getPlatform(),
        userCount: users.length,
        lastSync: lastSync,
        isNative: Capacitor.isNativePlatform(),
      };
    } catch (error) {
      console.error("❌ デバッグエラー", error);
      throw error;
    }
  }
}

export default new SQLiteService();
