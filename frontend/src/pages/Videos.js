import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const VideoSection = ({ videos }) => {
  const [level, setLevel] = useState('Higher');

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
            <div key={video.id} className="col-md-4">
              <div className="card mb-4 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">{video.title}</h5>
                  <p className="card-text">{video.description}</p>
                  <a href={video.link} className="btn btn-outline-primary">
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

// Example usage
const videos = [
  { id: 1, title: 'Simultaneous Equations', description: 'Learn the basics of Simultaneous Equations', link: '/videos/sim-eq', level: 'Higher' },
  // Add more videos here...
];

export const Videos = () => {
  return (
    <div>
      <VideoSection videos={videos} />
    </div>
  );
};
