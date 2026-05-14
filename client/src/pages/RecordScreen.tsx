import { useNavigate } from 'react-router-dom';
import { VoiceRecorder } from '../components/feed/VoiceRecorder';

export default function RecordScreen() {
  const navigate = useNavigate();

  return (
    <div className="h-full bg-echo-bg">
      <VoiceRecorder
        mode="post"
        onSuccess={(postId: string) => {
          navigate(`/post/${postId}`, { replace: true });
        }}
        onClose={() => navigate(-1)}
      />
    </div>
  );
}
