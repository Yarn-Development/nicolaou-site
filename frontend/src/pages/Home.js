import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

export const Home = () => {
  return (
    <div className="container mt-5">
      {/* Hero Section */}
      <div className="jumbotron text-center bg-primary text-white">
        <h1 className="display-4">Welcome to the Ms Nicolaou's Maths</h1>
        <p className="lead">
          Revolutionizing teaching and learning with AI-driven tools and interactive resources.
        </p>
        <hr className="my-4 bg-light" />
        <p>
          Explore our platform to access video content, generate worksheets, and create dynamic assessments.
        </p>
        <a className="btn btn-light btn-lg" href="#learn-more" role="button">
          Learn More
        </a>
        <br />
      </div>

      {/* Features Section */}
      <div id="learn-more" className="row text-center">
        {/* Video Content Section */}
        <div className="col-lg-4">
          <div className="card mb-4 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">KS3 & GCSE Video Library</h5>
              <p className="card-text">
                Access a comprehensive library of videos categorized by GCSE topics and levels.
              </p>
              <ul className="list-unstyled">
                <li>✓ Higher and Foundation Levels</li>
                <li>✓ Interactive video lessons</li>
                <li>✓ Linked worksheets and resources</li>
              </ul>
              <a href="/videos" className="btn btn-outline-primary">
                Explore Videos
              </a>
            </div>
          </div>
        </div>

        {/* Worksheet Generation Section */}
        <div className="col-lg-4">
          <div className="card mb-4 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">AI-Generated Worksheets</h5>
              <p className="card-text">
                Utilize AI technology to create customized worksheets for each topic.
              </p>
              <ul className="list-unstyled">
                <li>✓ Topic-specific worksheets</li>
                <li>✓ Printable PDF formats</li>
                <li>✓ Corbett Maths-style exercises</li>
              </ul>
              <a href="/worksheets" className="btn btn-outline-primary">
                Generate Worksheets
              </a>
            </div>
          </div>
        </div>

        {/* Exam Tools Section */}
        <div className="col-lg-4">
          <div className="card mb-4 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Exam and Assessment Tools</h5>
              <p className="card-text">
                Create custom exams and assessments using our extensive question bank.
              </p>
              <ul className="list-unstyled">
                <li>✓ Build exams by topic</li>
                <li>✓ Automatic feedback generation</li>
                <li>✓ Downloadable assessments</li>
              </ul>
              <a href="/assessments" className="btn btn-outline-primary">
                Create Assessments
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center mt-5">
        <h2>Join Our Community</h2>
        <p>Get started today and transform the way you teach and learn.</p>
        <a className="btn btn-success btn-lg" href="/signup" role="button">
          Sign Up Now
        </a>
      </div>
    </div>
  );
};
