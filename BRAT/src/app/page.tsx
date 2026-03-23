import DebugReplayLoader from '@/components/DebugReplayLoader';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <DebugReplayLoader />
    </div>
  );
}
