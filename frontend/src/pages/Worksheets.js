import React, { useEffect } from "react";
import { WorksheetUpload } from "../components/WorksheetUpload";
export const Worksheets = () => {
const onUpload = (newWorksheet) => {
    fetch("http://localhost:5001/upload_worksheet", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(newWorksheet),
    });
};

useEffect(() => {
    const fetchWorksheets = async () => {
        const response = await fetch("http://localhost:5001:/worksheets");
        const data = await response.json();
        if (data.status == 200) {
            return true;
        }
        return false;
    };

    // if fetch worksheets is true, return the worksheet upload component, if not redirect to login
    fetchWorksheets().then((result) => {
        if (!result) {
            window.location.href = "/login";
        }
    });
});

return (
    <div>
        <h1>Worksheets</h1>
        <WorksheetUpload onUpload={onUpload} />
    </div>
);


};