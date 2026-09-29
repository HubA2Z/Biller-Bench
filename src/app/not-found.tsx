import Link from "next/link";

export default function NotFound() {
  return <div className="empty"><h1>Page not found</h1><p>The question may have been removed, or it’s private to another practice.</p><Link className="btn" href="/">Browse questions</Link></div>;
}
