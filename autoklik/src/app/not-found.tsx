import Link from 'next/link';
import {Navbar} from "@/components/navbar";
import {ArrowRightIcon, SearchIcon} from "lucide-react";
import {Footer} from "@/components/footer";

export default function NotFound() {
        return (
            <>
                <header>
                    <Navbar />
                </header>

                <main className="bg-[var(--color-accent-soft)] font-semibold">

                    <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-16 sm:px-6">
                        <div className="w-full max-w-xl rounded-2xl border border-[var(--border-color)] bg-white p-8 text-center shadow-sm sm:p-12">
                            <div className="text-6xl font-extrabold text-[var(--color-navbar)] sm:text-7xl">
                                404
                            </div>
                            <h1 className="mt-4 text-2xl font-bold text-[var(--color-text)]">Stranica nije pronađena</h1>
                            <p className="mt-3 text-sm font-normal leading-6 text-gray-600">Poveznica je možda promijenjena ili stranica više nije dostupna. Nastavi pregledavati oglase ili se vrati na početnu stranicu.</p>
                            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                                <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-navbar)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-navbar-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-navbar)]">
                                    Na početnu <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                                </Link>
                                <Link href="/search" className="inline-flex items-center justify-center rounded-xl border border-[var(--border-color)] px-5 py-3 text-sm font-bold text-[var(--color-text)] transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-navbar)]">
                                    Pregledaj oglase
                                </Link>
                            </div>
                        </div>
                    </div>

                </main>

                <Footer />
            </>
    );
}
