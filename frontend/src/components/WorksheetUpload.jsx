// page to upload worksheet (only if login is admin or teacher)
import React, { useState } from "react";
export const WorksheetUpload = ({ onUpload }) => {
    const [topic, setTopic] = useState("");
    const [level, setLevel] = useState("Higher");
    const [file, setFile] = useState(null);

    const handleTopicChange = (e) => {
        setTopic(e.target.value);
    };

    const handleLevelChange = (e) => {
        setLevel(e.target.value);
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const newWorksheet = {
            id: Math.random(),
            topic,
            level,
            file,
        };
        
        onUpload(newWorksheet);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label htmlFor="topicInput">Topic:</label>
                <input
                    type="text"
                    className="form-control"
                    id="topicInput"
                    value={topic}
                    onChange={handleTopicChange}
                />
            </div>
            <div className="form-group">
                <label htmlFor="levelSelect">Level:</label>
                <select
                    className="form-control"
                    id="levelSelect"
                    value={level}
                    onChange={handleLevelChange}
                >
                    <option value="Higher">Higher</option>
                    <option value="Foundation">Foundation</option>
                </select>
            </div>
            <div className="form-group">
                <label htmlFor="fileInput">Upload File:</label>
                <input
                    type="file"
                    className="form-control-file"
                    id="fileInput"
                    onChange={handleFileChange}
                />
            </div>
            <button type="submit" className="btn btn-primary">
                Upload Worksheet
            </button>

        </form>
    );
}