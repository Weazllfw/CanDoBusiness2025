import { redirect } from 'next/navigation';

export default async function Home() {
  // TODO: Add authentication check here
  const isAuthenticated = false;
  
  if (isAuthenticated) {
    redirect('/dashboard');
  } else {
    redirect('/auth/login');
  }
} 