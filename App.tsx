
import React, { useState, useEffect, useCallback } from 'react';
import { Project, ProjectType } from './types';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import Login from "./components/Login";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebase";
import { db } from "./services/firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { User } from "firebase/auth";


/* const STORAGE_KEY = 'AI_COAUTHOR_STUDIO_PERSISTENT_V1'; */

const App: React.FC = () => {
const [projects, setProjects] = useState<Project[]>([]);

  //Hàm đăng xuất người dùng
  const handleLogout = async () => {
  await signOut(auth);
  setUser(null);
};

  // Hàm lưu trữ dự án lên Firestore
const saveProject = async (project: Project) => {
  if (!user) return;

  await setDoc(
    doc(db, "users", user.uid, "projects", project.id),
    project
  );
};

// Hàm tải dự án từ Firestore khi người dùng đăng nhập
const subscribeProjects  = (currentUser: User) => {
  const q = collection(db, "users", currentUser.uid, "projects");

  return onSnapshot(q, (snapshot) => {

  const list: Project[] = snapshot.docs.map((d) => {
    const data = d.data() as Project;

    return {
      ...data,
      id: d.id
    };
  });

  setProjects(list);
  });
};
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

useEffect(() => {

  let unsubscribeProjects: any;

  const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {

    setUser(currentUser);

    if (currentUser) {
      unsubscribeProjects = subscribeProjects(currentUser);
    }

  });

  return () => {
    if (unsubscribeProjects) unsubscribeProjects();
    unsubscribeAuth();
  };

}, []);

  /* Hàm lưu trữ đồng bộ để đảm bảo an toàn dữ liệu
  const persistToDisk = (data: Project[]) => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Không thể lưu vào localStorage:", e);
    }
    // Hiệu ứng nhẹ để người dùng an tâm
    setTimeout(() => setIsSaving(false), 800);
  };
*/

  const createProject = (title: string, type: ProjectType) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      title,
      type,
      genre: 'Chưa xác định',
      worldBible: '',
      tone: 'Tự nhiên',
      characters: [],
      // Fix: Add missing relationships property required by Project type
      relationships: [],
      chapters: [],
      chatHistory: [],
      lastUpdated: Date.now()
    };
    const nextProjects = [newProject, ...projects];
    setProjects(nextProjects);
    saveProject(newProject); 
    setActiveProjectId(newProject.id);
  };

  const importProject = (projectData: Project) => {
    const newProject = { ...projectData, id: crypto.randomUUID(), lastUpdated: Date.now() };
    const nextProjects = [newProject, ...projects];
    setProjects(nextProjects);
  };

const updateProject = (updatedProject: Project) => {
  const index = projects.findIndex(p => p.id === updatedProject.id);
  if (index === -1) return;

  const nextProjects = [...projects];
  const newProject = {
    ...updatedProject,
    lastUpdated: Date.now()
  };

  nextProjects[index] = newProject;

  setProjects(nextProjects);

  saveProject(newProject);
};

const deleteProject = async (id: string) => {

  if (user) {
    await deleteDoc(doc(db, "users", user.uid, "projects", id));
  }

  const nextProjects = projects.filter(p => p.id !== id);
  setProjects(nextProjects);

  if (activeProjectId === id) setActiveProjectId(null);
};

  const exportAllProjects = () => {
    const dataStr = JSON.stringify(projects, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `all-projects-backup-${new Date().toLocaleDateString()}.json`);
    linkElement.click();
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

if (!user) {
  return <Login onLogin={setUser} />;
}
  return (
    
    <div className="min-h-screen bg-slate-50 flex flex-col relative selection:bg-indigo-100">
      {/* Chỉ báo trạng thái lưu trữ */}
      <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
        <div className={`bg-slate-900 text-white text-[10px] px-4 py-2 rounded-2xl flex items-center gap-3 border border-white/10 shadow-2xl transition-all duration-500 ${isSaving ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></div>
          <span className="font-black tracking-widest uppercase">Đang đồng bộ đĩa...</span>
        </div>
      </div>
      <button
  onClick={handleLogout}
  className="fixed top-4 right-4 px-4 py-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl text-xs">
  Log out </button>
      <div className="fade-in flex-1 flex flex-col">
        {activeProjectId && activeProject ? (
          <ProjectView 
            project={activeProject} 
            onUpdate={updateProject} 
            onBack={() => setActiveProjectId(null)} 
          />
        ) : (
          <Dashboard 
            projects={projects} 
            onCreate={createProject} 
            onSelect={setActiveProjectId} 
            onDelete={deleteProject}
            onImport={importProject}
            onExportAll={exportAllProjects}
          />
        )}
      </div>
    </div>
  );
};

export default App;
