import "../styles/Report.css";
import PageTitle from "../components/PageTitle/PageTitle";
import React, { useState } from "react";

interface RatingProps {
    email: string;
}

const Report: React.FC<RatingProps> = (props) => {
    //state to store selected reason
    const [selectedReason, setSelectedReason] = useState("");

    //state to store selected comment
    const [comments, setComments] = useState("");

    /** @TODO Replace value with reportee name */
    const reportedUser = "[Var]";

    //function to handle change in dropdown selection
    const handleReasonChange = (event) => {
        setSelectedReason(event.target.value);
    };

    // Function to handle changes in the comments textarea
    const handleCommentsChange = (event) => {
        setComments(event.target.value);
    };

    // Function to handle submitting the report
    const handleSubmitReport = async () => {
        try {
            fetch(`/send-report`, {
                method: "POST",
                headers: { "Content-type": "application/json" },
                body: JSON.stringify({
                    email: props.email,
                    reason: selectedReason,
                    comments: comments,
                }),
            })
        }
        catch (e: any) {
            console.log(e);
        }
    };

    return (
        <PageTitle title="Report User">
            <main id="report">
                <h1> Report User</h1>
                <div className="reportContainer">
                    <h2>You are reporting: {reportedUser}</h2>

                    {/* Dropdown menu */}
                    <label className="reportLabel" htmlFor="reason">
                        Select a reason for reporting:
                    </label>
                    <select
                        id="reason"
                        name="reason"
                        className="reportSelect"
                        onChange={handleReasonChange}
                        value={selectedReason}
                    >
                        <option value="">-----</option>
                        <option value="inappropriate_behavior">Inappropriate Behavior</option>
                        <option value="harassment">Harassment</option>
                        <option value="unsafe_driving">Unsafe Driving</option>
                        {/* Add more options as needed */}
                    </select>

                    {/* Text area for extra comments */}
                    <label htmlFor="comments">Extra Comments:</label>
                    <textarea
                        id="comments"
                        name="comments"
                        rows={4} // You can adjust the number of rows as needed
                        onChange={handleCommentsChange}
                        value={comments}
                    />

                    <button className="reportButton" onClick={handleSubmitReport}>
                        Submit Report
                    </button>
                </div>
            </main>
        </PageTitle>
    );
}

export default Report;
