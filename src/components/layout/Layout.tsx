import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './Sidebar';
import { authService } from '@/services/authService';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Système d'Analyse de Risque CNPS</h1>
            </div>
          </header>

          {/* Contenu principal */}
          <main className="flex-1 overflow-auto p-6">
            {children || <Outlet />}
          </main>
        </div>
      </div>

      {/* Notifications toast */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        className="z-50"
      />
    </SidebarProvider>
  );
};

export default Layout;