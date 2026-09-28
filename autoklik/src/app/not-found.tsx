import Link from 'next/link';

export default function NotFound() {
        return (
            <div className="h-screen w-screen bg-gray-100 flex items-center">
                <div className="container flex flex-col md:flex-row items-center justify-center px-5 text-gray-700">
                    <div className="max-w-md">
                        <div className="text-5xl font-dark font-bold">404</div>
                        <p
                            className="text-2xl md:text-3xl font-light leading-normal"
                        >Sorry we couldn&apos;t find this page.</p>
                        <p className="mb-8">But don&apos;t worry, you can find plenty of other things on our homepage.</p>

                        <Link href="/" className="inline rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium leading-5 text-white shadow transition-colors hover:bg-blue-700">
                            Back to homepage
                        </Link>
                    </div>
                </div>
            </div>
    );
}
