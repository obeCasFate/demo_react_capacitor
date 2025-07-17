import Button from "./Button.jsx";

export default function ProjectsSidebar({
  onStartAddProject,
  projects,
  onSelectProject,
  selectedProjectID,
  onShowUsers,
  onShowProject,
  currentView,
  isAuthenticated,
  user,
  onLogout,
}) {
  return (
    <aside className="w-1/3 px-8 py-16 bg-stone-900 text-stone-50 md:w-72 rounded-r-xl">
      <h2 className="mb-8 font-bold uppercase md:text-xl text-stone-200">
        ナビゲーション
      </h2>

      {/* ナビゲーションメニュー */}
      <div className="flex flex-col space-y-2 mb-8">
        <button
          onClick={onShowProject}
          className={`w-full text-left px-4 py-2 rounded-sm transition-colors ${
            currentView === "projects"
              ? "bg-stone-800 text-stone-50"
              : "text-stone-400 hover:text-stone-200 hover:bg-stone-800"
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span>倉庫在庫管理</span>
          </div>
        </button>

        <button
          onClick={onShowUsers}
          className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
            currentView === "users"
              ? "bg-stone-800 text-stone-50"
              : "text-stone-400 hover:text-stone-200 hover:bg-stone-800"
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5"
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
            <span>ユーザー管理</span>
            {!isAuthenticated && (
              <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-0.5 rounded">
                認証必要
              </span>
            )}
          </div>
        </button>
      </div>

      {/* ユーザー認証エリア */}
      <div className="mb-8 p-4 bg-stone-800 rounded-lg">
        {isAuthenticated ? (
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center text-white text-sm font-semibold"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-200 truncate">
                  {user?.first_name && user?.last_name
                    ? `${user?.last_name} ${user?.first_name}`
                    : user?.email || "ユーザー"}
                </p>
                <p className="text-xs text-stone-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full text-left px-3 py-2 text-sm bg-stone-700 hover:bg-stone-600 text-stone-300 hover:text-stone-100 rounded transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="nonw"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>ログアウト</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-8 h-8 bg-stone-600 rounded-full flex items-center justify-center text-stone-400 text-sm mx-auto mb-2">
              <svg
                className="w-4 h-4"
                full="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <p className="text-xs text-stone-400 mb-2">未認証</p>
            <p className="text-xs text-stone-500">
              ユーザー管理には認証が必要です
            </p>
          </div>
        )}
      </div>

      {/* Project view */}
      {currentView === "projects" && (
        <div>
          <h2 className="mb-8 font-bold uppercase md:text-xl text-stone-200">
            原材・包材在庫管理
          </h2>
          <div className="mb-8">
            {/** button className="" {...props} */}
            {/** handleStartAddProject function pointer on App.jsx is forwarded to the onClick prop */}
            <Button onClick={onStartAddProject}>+ 新規データを登録</Button>
          </div>
          {projects.length > 0 ? (
            <ul className="mt-8">
              {projects.map((project) => {
                let cssClasses =
                  "w-full text-left px-2 py-1 rounded-sm my-1 hover:text-stone-200 hover:bg-stone-800";
                if (project.id === selectedProjectID) {
                  cssClasses += " bg-stone-800 text-stone-200";
                } else {
                  cssClasses += " text-stone-400";
                }
                return (
                  <li key={project.id}>
                    {/* View the details of the selected project */}
                    <button
                      className={cssClasses}
                      onClick={() => onSelectProject(project.id)}
                    >
                      {project.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-stone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-2 text-sm text-stone-400">
                データが見つかりません
              </p>
              <p className="text-xs text-stone-500">新規データを登録</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
