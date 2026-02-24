import { useState } from 'react';
import axios from '../../utils/axios';

export default function IssueCertificate() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [course, setCourse] = useState('');
    const [msg, setMsg] = useState('');

    const issue = async () => {
        try {
            await axios.post('/issuer/certificates', {
                recipientEmail: email,
                studentName: name,
                courseName: course
            });
            setMsg('Certificate issued successfully');
        } catch (e) {
            setMsg(e.response?.data?.error || 'Error');
        }
    };

    return (
        <div className="card">
            <h2>Issue Certificate</h2>
            <input placeholder="Student Email" onChange={e => setEmail(e.target.value)} />
            <input placeholder="Student Name" onChange={e => setName(e.target.value)} />
            <input placeholder="Course Name" onChange={e => setCourse(e.target.value)} />
            <button onClick={issue}>Issue</button>
            {msg && <p>{msg}</p>}
        </div>
    );
}
