"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useCallback } from "react";

/* 

TODO
- connect to backend:
- add metric post to questionnairepage
- question: how does metric posting work? can you just post anything to /metrics and it works automatically?
- just try it

*/

const TEST_VERSION = new Map([
    ["omst", "OMST"],
    ["icon", "ICON"],
    ["gamified-mst", "Gamified MST"],
]);

const LOCATION_OPTIONS = [
    "Home",
    "Work",
    "Someone else's home",
    "Public place indoors",
    "Public place outdoors",
    "Transportation",
    "None of the Above",
];

const INTERFERENCE_OPTIONS = [
    "Device not responding to taps",
    "Difficulty loading images",
    "Website freezing or crashing",
    "Difficulty seeing the images or text",
    "Device interruption (message, notification, etc.)",
    "Environmental interruptions (fire alarm, family member talking, etc.)",
    "Other technological distractions",
    "None of the Above",
];

const EXPERIENCE_OPTIONS = [
    "Fatigue",
    "Pain",
    "Nervousness",
    "Other physical or emotional experiences",
    "None of the Above",
];

const NONE_OF_THE_ABOVE = "None of the Above";

// Default test values — valid answers for every required question
const TEST_DEFAULTS = {
    experience: "8",
    location: "Home",
    performance: "7",
    interferences: [NONE_OF_THE_ABOVE],
    experiences: [NONE_OF_THE_ABOVE],
};

function toggleMultiSelect(current: string[], option: string): string[] {
    const isSelected = current.includes(option);
    if (option === NONE_OF_THE_ABOVE) {
        return isSelected ? [] : [NONE_OF_THE_ABOVE];
    }
    const withoutNone = current.filter((item) => item !== NONE_OF_THE_ABOVE);
    return isSelected
        ? withoutNone.filter((item) => item !== option)
        : [...withoutNone, option];
}

function isWholeNumberInRange(value: string, min: number, max: number) {
    if (value.trim() === "") return false;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

export default function QuestionnairePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [testVersion, setTestVersion] = useState("");
    const testVersionTitle = TEST_VERSION.get(testVersion) || "";

    const [prolificPID, setProlificPID] = useState("");
    const [sessionID, setSessionID] = useState("");
    const [studyID, setStudyID] = useState("");

    const [experience, setExperience] = useState("");
    const [location, setLocation] = useState("");
    const [performance, setPerformance] = useState("");
    const [interferences, setInterferences] = useState<string[]>([]);
    const [experiences, setExperiences] = useState<string[]>([]);

    const isExperienceValid = isWholeNumberInRange(experience, 1, 10);
    const isPerformanceValid = isWholeNumberInRange(performance, 0, 10);
    const canContinue =
        isExperienceValid &&
        Boolean(location) &&
        isPerformanceValid &&
        interferences.length > 0 &&
        experiences.length > 0;

    useEffect(() => {
        setTestVersion(searchParams.get("route") || "");
        setProlificPID(searchParams.get("PROLIFIC_PID") || "");
        setSessionID(searchParams.get("SESSION_ID") || "");
        setStudyID(searchParams.get("STUDY_ID") || "");
    }, []);

    const handleContinue = () => {
        if (!canContinue) return;

        // In test mode, IDs are already auto-generated; skip the Prolific param guard
        if (!prolificPID || !sessionID) {
            alert(
                "Missing required Prolific parameters (PROLIFIC_PID and SESSION_ID)",
            );
            return;
        }

        // window.sessionStorage.setItem(
        //     "mst_post_study_questionnaire",
        //     JSON.stringify({
        //         experienceRating: Number(experience),
        //         location,
        //         performanceRating: Number(performance),
        //         interferences,
        //         experiences,
        //     }),
        // );

        saveSurveyData();

        const prolificComplete =
            process.env.NEXT_PUBLIC_PROLIFIC_COMPLETE_STUDY ||
            "https://app.prolific.com/submissions/complete";
        window.location.href = prolificComplete;
    };

    const saveSurveyData = async () => {
        const AWS_API_GATEWAY = process.env.NEXT_PUBLIC_AWS_METRICS_API;

        if (!AWS_API_GATEWAY) {
            console.error("AWS API Gateway URL not configured");
            return;
        }

        try {
            const payload = {
                prolificPID,
                studyID,
                sessionID,
                experienceRating: Number(experience),
                location,
                performanceRating: Number(performance),
                interferences,
                experiences,
            };

            const response = await fetch(`${AWS_API_GATEWAY}/metrics`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                throw new Error(`Trial save failed: ${response.status}`);
            }
        } catch (e) {
            console.error("Failed to save survey data:", e);
        }
    };

    // Allow Enter key to continue when all required fields are filled
    const onEnterPress = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Enter" && canContinue) {
                handleContinue();
            }
        },
        [canContinue, handleContinue],
    );

    useEffect(() => {
        window.addEventListener("keydown", onEnterPress);
        return () => window.removeEventListener("keydown", onEnterPress);
    }, [onEnterPress]);

    const labelStyle = {
        display: "block",
        marginBottom: "8px",
        fontWeight: "700",
        fontSize: "18px",
    };
    const radioContainerStyle = {
        marginLeft: "20px",
        marginBottom: "15px",
        textAlign: "left" as const,
    };
    const radioLabelStyle = {
        marginLeft: "10px",
        fontSize: "16px",
        fontWeight: "400",
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
                width: "100%",
                fontFamily: "'Open Sans', sans-serif",
                backgroundColor: "#fff",
                color: "#333",
            }}
        >
            <div
                style={{
                    flex: 1,
                    margin: "20px auto",
                    padding: "20px 20px 140px",
                    maxWidth: "720px",
                    width: "95%",
                    overflowY: "auto",
                    WebkitOverflowScrolling: "touch",
                    boxSizing: "border-box",
                    maxHeight: "calc(100vh - 80px)",
                }}
            >
                <div style={{ textAlign: "center", marginBottom: "18px" }}>
                    <h1 style={{ fontSize: "28px", margin: 0 }}>
                        Post Study Questionnaire
                    </h1>
                </div>

                {/* EXPERIENCE */}
                <div style={radioContainerStyle}>
                    <label style={labelStyle}>
                        Rate your experience on the {testVersionTitle} Test:
                        Scale of 1 to 10, where 1 is “Very Frustrating” and 10
                        is “Very Enjoyable.”
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={10}
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="Enter a number from 1 to 10"
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            fontSize: "16px",
                        }}
                    />
                    {!isExperienceValid && experience !== "" && (
                        <div style={{ color: "#b00", marginTop: 8 }}>
                            Enter a whole number from 1 to 10.
                        </div>
                    )}
                </div>

                {/* LOCATION */}
                <div style={radioContainerStyle}>
                    <label style={labelStyle}>
                        Where were you when you took the {testVersionTitle}{" "}
                        Test? (choose one)
                    </label>
                    {LOCATION_OPTIONS.map((option) => (
                        <label
                            key={option}
                            style={{ display: "block", cursor: "pointer" }}
                        >
                            <input
                                type="radio"
                                name="location"
                                value={option}
                                checked={location === option}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                            <span style={radioLabelStyle}>{option}</span>
                        </label>
                    ))}
                </div>

                {/* PERFORMANCE */}
                <div style={radioContainerStyle}>
                    <label style={labelStyle}>
                        Please rate your performance on the {testVersionTitle}{" "}
                        Test today (0-10)
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={10}
                        value={performance}
                        onChange={(e) => setPerformance(e.target.value)}
                        placeholder="Enter a number from 0 to 10"
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            fontSize: "16px",
                        }}
                    />
                    {!isPerformanceValid && performance !== "" && (
                        <div style={{ color: "#b00", marginTop: 8 }}>
                            Enter a whole number from 0 to 10.
                        </div>
                    )}
                </div>

                {/* INTERFERENCE */}
                <div style={radioContainerStyle}>
                    <label style={labelStyle}>
                        Did any of the following interfere with your performance
                        on the {testVersionTitle} Test today? (select all that
                        apply)
                    </label>
                    {INTERFERENCE_OPTIONS.map((option) => (
                        <label
                            key={option}
                            style={{ display: "block", cursor: "pointer" }}
                        >
                            <input
                                type="checkbox"
                                name="interference"
                                value={option}
                                checked={interferences.includes(option)}
                                onChange={() =>
                                    setInterferences((current) =>
                                        toggleMultiSelect(current, option),
                                    )
                                }
                            />
                            <span style={radioLabelStyle}>{option}</span>
                        </label>
                    ))}
                </div>

                {/* EXPERIENCES */}
                <div style={radioContainerStyle}>
                    <label style={labelStyle}>
                        Did you experience any of the following on the{" "}
                        {testVersionTitle} Test today? (select all that apply)
                    </label>
                    {EXPERIENCE_OPTIONS.map((option) => (
                        <label
                            key={option}
                            style={{ display: "block", cursor: "pointer" }}
                        >
                            <input
                                type="checkbox"
                                name="experiences"
                                value={option}
                                checked={experiences.includes(option)}
                                onChange={() =>
                                    setExperiences((current) =>
                                        toggleMultiSelect(current, option),
                                    )
                                }
                            />
                            <span style={radioLabelStyle}>{option}</span>
                        </label>
                    ))}
                </div>

                {/* Fixed footer button to ensure visibility on small screens */}
                <div
                    style={{
                        position: "fixed",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "#fff",
                        borderTop: "1px solid #eee",
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "center",
                        zIndex: 9999,
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            maxWidth: 720,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ fontSize: 14, color: "#555" }}>
                            {isExperienceValid
                                ? ""
                                : "Experience rating (1–10) required • "}
                            {location ? "" : "Location required • "}
                            {isPerformanceValid
                                ? ""
                                : "Performance rating (0–10) required • "}
                            {interferences.length
                                ? ""
                                : "Interference required • "}
                            {experiences.length ? "" : "Experiences required"}
                        </div>
                        <button
                            onClick={handleContinue}
                            disabled={!canContinue}
                            style={{
                                padding: "10px 18px",
                                fontSize: "16px",
                                cursor: canContinue ? "pointer" : "not-allowed",
                                backgroundColor: canContinue
                                    ? "#0366d6"
                                    : "#e9ecef",
                                border:
                                    "1px solid " +
                                    (canContinue ? "#0366d6" : "#ddd"),
                                borderRadius: "6px",
                                color: canContinue ? "#fff" : "#777",
                                fontWeight: 700,
                            }}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
