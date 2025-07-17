import ProjectsSidebar2 from "./components/ProjectsSidebar2.jsx";
import NewProject from "./components/NewProject.jsx";
import NoProjectSelected from "./components/NoProjectSelected.jsx";
import SelectedProject from "./components/SelectedProject.jsx";
import UserList from "./components/UserList.jsx";
import LoginForm from "./components/LoginForm.jsx";
import { useState, useEffect } from "react";
import authService from "./services/authService.js";

function App() {
  // State Control: Handle which component is displayed
  const [projectsState, setProjectsState] = useState({
    selectedProjectID: undefined,
    projects: [],
    currentView: "projects", // 'projects' or 'users'
  });

  // Authentication state
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    loading: true, // Show loading while checking auth status
  });

  const [syncState, setSyncState] = useState({
    syncing: false,
    syncError: null,
  });

  // Check authentication status on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setAuthState((prev) => ({ ...prev, loading: true }));
        if (authService.isAuthenticated()) {
          // Verify token is still valid
          const userData = await authService.getCurrentUser();
          setAuthState({
            isAuthenticated: true,
            user: userData,
            loading: false,
          });
          console.log("✅ Auth verified on app load");
        } else {
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
          });
          console.log("ℹ️ No authentication found on app load");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // Token might be invalid, clear auth
        await authService.logout();
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
        });
      }
    };

    checkAuthStatus();
  }, []);

  // Handle successful login
  const handleLoginSuccess = (userData) => {
    setAuthState({
      isAuthenticated: true,
      user: userData.user,
      loading: false,
    });
    setProjectsState((prevState) => ({
      ...prevState,
      currentView: "users",
      selectedProjectID: undefined,
    }));
    console.log("✅ Login success handled in App - navigating to users view");
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout();
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
      // Reset to projects view after logout
      setProjectsState((prevState) => ({
        ...prevState,
        currentView: "projects",
        selectedProjectID: undefined,
      }));
      console.log("✅ Logout completed");
    } catch (error) {
      console.error("Logout error:", error);
      // Force clear state even if logout is failed
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
    }
  };

  /**
   * Should be triggered after adding a new project
   */
  function handleStartAddProject() {
    setProjectsState((prevState) => {
      return {
        ...prevState,
        selectedProjectID: null,
        currentView: "projects",
      };
    });
  }

  /**
   * Handle Selected object
   */
  function handleSelectedProject(id) {
    setProjectsState((prevState) => {
      return {
        ...prevState,
        selectedProjectID: id,
        currentView: "projects",
      };
    });
  }

  /**
   * Switch to user management view
   */
  function handleShowUsers() {
    setProjectsState((prevState) => {
      return {
        ...prevState,
        selectedProjectID: undefined,
        currentView: "users",
      };
    });
  }

  /**
   * Switch back to project view
   */
  function handleShowProjects() {
    setProjectsState((prevState) => {
      return {
        ...prevState,
        currentView: "projects",
      };
    });
  }

  /**
   * NewProject's object will be received here
   */
  function handleAddProject(projectData) {
    setProjectsState((prevState) => {
      const projectID = Math.random();

      const NewProject = {
        ...projectData,
        id: projectID,
      };

      return {
        ...prevState,
        selectedProjectID: undefined,
        projects: [...prevState.projects, NewProject],
      };
    });
  }

  function handleCancelAddProject() {
    setProjectsState((prevState) => {
      return {
        ...prevState,
        selectedProjectID: undefined,
        currentView: "projects",
      };
    });
  }

  // Find selected project
  const selectedProject = projectsState.projects.find(
    (project) => project.id === projectsState.selectedProjectID
  );

  // Show loading while checking authentication
  if (authState.loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // Determine content based on current view and auth status
  let content;

  if (projectsState.currentView === "users") {
    // Users view - requires authentication
    if (!authState.isAuthenticated) {
      content = (
        <LoginForm
          onLoginSuccess={handleLoginSuccess}
          message="ユーザー管理にアクセスするにはログインしてください。"
        />
      );
    } else {
      content = <UserList user={authState.user} />;
    }
  } else {
    // Projects view - no authentication required
    if (projectsState.selectedProjectID === null) {
      content = (
        <NewProject
          onAdd={handleAddProject}
          onCancel={handleCancelAddProject}
        />
      );
    } else if (projectsState.selectedProjectID === undefined) {
      content = <NoProjectSelected onStartAddProject={handleStartAddProject} />;
    } else {
      content = <SelectedProject project={selectedProject} />;
    }
  }
  // ✅ Add debug info to console
  console.log("🔍 Current state:", {
    currentView: projectsState.currentView,
    isAuthenticated: authState.isAuthenticated,
    user: authState.user?.email,
    contentType: content?.type?.name || "Unknown",
  });

  return (
    <main className="h-screen my-8 flex gap-8">
      <ProjectsSidebar2
        onStartAddProject={handleStartAddProject}
        projects={projectsState.projects}
        onSelectProject={handleSelectedProject}
        selectedProjectID={projectsState.selectedProjectID}
        onShowUsers={handleShowUsers}
        onShowProject={handleShowProjects}
        currentView={projectsState.currentView}
        // Pass authentication info to sidebar
        isAuthenticated={authState.isAuthenticated}
        user={authState.user}
        onLogout={handleLogout}
      />
      {content}
    </main>
  );
}

export default App;
