import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel mx-auto max-w-3xl p-10 text-center">
      <p className="eyebrow">Not Found</p>
      <h1 className="mt-3 text-4xl font-semibold">未找到对应内容</h1>
      <p className="mt-4 leading-8 text-ink/68">
        当前请求的页面或行业样例数据不存在。你可以返回首页重新浏览行业机会榜单，或进入基金发现页继续查看候选基金。
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
          返回首页
        </Link>
        <Link href="/funds" className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-semibold">
          进入基金发现
        </Link>
      </div>
    </div>
  );
}
