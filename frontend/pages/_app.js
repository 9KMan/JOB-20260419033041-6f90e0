import '@/styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <Component {...pageProps} />
      </SocketProvider>
    </AuthProvider>
  );
}