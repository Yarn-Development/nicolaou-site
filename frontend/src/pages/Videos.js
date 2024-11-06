import React, { useState, useEffect } from 'react';
import fetch from 'node-fetch';
import 'bootstrap/dist/css/bootstrap.min.css';

const VideoSection = () => {
  const [level, setLevel] = useState('Higher');
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    const fetchVideos = async () => {
      const response = await fetch('http://localhost:5000/videos').then((res) =>
        res.json()
      );
      setVideos(response.data);
    };

    fetchVideos();
  }, []);

  const handleLevelChange = (e) => {
    setLevel(e.target.value);
  };

  return (
    <div className="container mt-5">
      <h2>GCSE Video Topics</h2>
      <div className="form-group">
        <label htmlFor="levelSelect">Select Level:</label>
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
      <div className="row">
        {videos
          .filter((video) => video.level === level)
          .map((video) => (
            <div key={video._id} className="col-md-4">
              <div className="card mb-4 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">{video.title}</h5>
                  <p className="card-text">{video.description}</p>
                  <a href={`http://localhost:5000${video.link}`} className="btn btn-outline-primary">
                    Watch Video
                  </a>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export const Videos = () => {
  return (
    <div>
      <VideoSection />
    </div>
  );
};