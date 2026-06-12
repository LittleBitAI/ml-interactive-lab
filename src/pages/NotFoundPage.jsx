import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <main className="center-page">
      <h1>페이지를 찾을 수 없습니다.</h1>
      <p>주소가 잘못되었거나 아직 등록되지 않은 위젯입니다.</p>
      <Link className="text-link" to="/">
        위젯 목록으로 돌아가기
      </Link>
    </main>
  );
}
