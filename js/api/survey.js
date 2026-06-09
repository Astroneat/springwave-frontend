import { get, post } from "./client.js";

export function getSurveyQuestions() {
    return get("/survey/questions");
}

export function submitSurvey(answers) {
    return post("/survey/submit", { answers });
}

export function getSurveyResult() {
    return get("/survey/result");
}

export function getSurveySuggestions() {
    return get("/survey/suggestions");
}
