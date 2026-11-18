import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";

export default function Instructions() {
  const { testId } = useParams();
  const nav = useNavigate();
  const [t, setT] = useState(null);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { api(`/tests/${testId}/`).then(setT).catch((e) => setErr(e.message)); }, [testId]);
  if (err) return <p className="err center">{err}</p>;
  if (!t) return <p className="center">Loading...</p>;
  const extra = (t.instructions || "").split("\n").map((x) => x.trim()).filter(Boolean);
  return (
    <div className="wrap">
      <div className="card">
        <h1>{t.name}</h1>
        <div className="scroll"><table>
          <tbody>
            <tr><th>Total questions</th><td>{t.total_questions}</td><th>Duration</th><td>{t.duration_minutes} minutes</td></tr>
            <tr><th>Maximum marks</th><td>{t.total_marks}</td><th>Marks per question</th><td>+{t.marks_per_question}</td></tr>
            <tr><th>Negative marking</th><td colSpan={3}>{t.negative_marks > 0 ? `-${t.negative_marks} for every wrong answer` : "None"}</td></tr>
          </tbody></table></div>
        <h2>Sections</h2>
        <ul>{t.sections.map((s, i) => <li key={i}>{s.subject}: {s.count} questions</li>)}</ul>
        <h2>General instructions</h2>
        <ol className="ins">
          <li>The total duration of the examination is <b>{t.duration_minutes} minutes</b>. The countdown timer at the top right shows the remaining time. When it reaches zero, the test is submitted automatically.</li>
          <li>The timer runs on the server. It cannot be changed or paused, and refreshing or reopening the page does not reset it.</li>
          <li>The question palette on the right shows the status of each question:
            <ul className="legend">
              <li><i className="nv" /> Not visited</li><li><i className="na" /> Not answered</li>
              <li><i className="an" /> Answered</li><li><i className="mk" /> Marked for review</li>
              <li><i className="ma" /> Answered and marked for review (will be evaluated)</li>
            </ul></li>
          <li>Each question has four options. Select one option. To change your answer, select another option. Use <b>Clear Response</b> to remove your answer.</li>
          <li>Marking: <b>+{t.marks_per_question}</b> for each correct answer; <b>{t.negative_marks > 0 ? `-${t.negative_marks}` : "no deduction"}</b> for each wrong answer; no marks are deducted for unattempted questions.</li>
          <li><b>Save &amp; Next</b> saves your answer and moves to the next question. <b>Mark for Review &amp; Next</b> saves and marks the question for review.</li>
          <li>Use the section buttons or the palette to move to any question.</li>
          <li>You may submit the test before time ends. Your result will be calculated on the questions you have attempted; unattempted questions carry zero marks.</li>
          <li>Once submitted, the test cannot be re-opened. Do not close the browser or switch off your device during the test.</li>
          <li>Use of unfair means, mobile phones, calculators or any help from others is strictly prohibited.</li>
          {extra.map((x, i) => <li key={i}>{x}</li>)}
        </ol>
        <label className="chk"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> I have read and understood all the instructions. I agree to follow them.</label>
        <div className="bar"><button className="pri" disabled={!ok} onClick={() => nav(`/exam/${testId}`)}>I am ready to begin</button></div>
      </div>
    </div>
  );
}
