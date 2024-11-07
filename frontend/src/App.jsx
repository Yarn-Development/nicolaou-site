// REact boilerplate
import React from "react";
import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import  Navbar  from "./components/Navbar";
import  Footer  from "./components/Footer";
import { Assessments } from "./pages/Assessments";
import { Worksheets } from "./pages/Worksheets";
import { Videos } from "./pages/Videos";
import { LoginPage } from "./pages/Login";
import "./App.css";

export const App = () => {
    return (
        <div className="App">
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/assessments" element={<Assessments />} />
                <Route path="/worksheets" element={<Worksheets />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
            <Footer />
        </div>
    );
}