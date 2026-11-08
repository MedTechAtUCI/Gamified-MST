"use client";

import { Suspense } from "react";
import QuestionnairePage from "@/app/components/QuestionnairePage/QuestionnairePage";

export default function Page() {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center">
                    Loading...
                </div>
            }
        >
            <QuestionnairePage />
        </Suspense>
    );
}
