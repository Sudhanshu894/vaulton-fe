import { NextResponse } from "next/server";

const DASHBOARD_ACCESS_KEY = "adminlockkey";
const DASHBOARD_ACCESS_COOKIE = "vaulton_dashboard_access";

export function middleware(request) {
    const providedKey = request.nextUrl.searchParams.get("key");
    const hasAccessCookie = request.cookies.get(DASHBOARD_ACCESS_COOKIE)?.value === "1";

    if (providedKey === DASHBOARD_ACCESS_KEY) {
        const url = request.nextUrl.clone();
        url.searchParams.delete("key");

        const response = NextResponse.redirect(url);
        response.cookies.set({
            name: DASHBOARD_ACCESS_COOKIE,
            value: "1",
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });
        return response;
    }

    if (hasAccessCookie) {
        return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
