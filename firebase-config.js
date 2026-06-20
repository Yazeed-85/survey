// Firebase configuration — shared project, isolated paths.
// IMPORTANT: This project also hosts a separate Mafia game.
// This survey ONLY ever reads/writes under "survey_results" and "survey_metadata".
// Never touch mafia_rooms / mafia_logs / players / settings here.

export const firebaseConfig = {
    apiKey: "AIzaSyB5CobIKfYdAz8jaabJpMQrGoqS9Ton28Y",
    authDomain: "buttons-f3501.firebaseapp.com",
    databaseURL: "https://buttons-f3501-default-rtdb.firebaseio.com",
    projectId: "buttons-f3501"
};

// Dedicated, isolated database paths for this project only.
export const DB_PATHS = {
    results: "survey_results",
    metadata: "survey_metadata"
};
