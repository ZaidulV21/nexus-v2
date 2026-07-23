import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

interface PublicLayoutProps {
  children?: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="pt-18">
        {children || <Outlet />}
      </main>
      <Footer />
    </div>
  );
}
