import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const API = "https://todo-backend-pywu.onrender.com";

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  const [name, setName] = useState(localStorage.getItem("name") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState([]);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [daily, setDaily] = useState(0);
  const [overall, setOverall] = useState(0);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [chartData, setChartData] = useState([]);

  const pageStyle = {
    background: "#0f172a",
    minHeight: "100vh",
    color: "#f8fafc",
    padding: "30px",
    fontFamily: "Arial, sans-serif"
  };

  const cardStyle = {
    background: "#1e293b",
    padding: "20px",
    borderRadius: "16px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
    marginBottom: "20px"
  };

  const inputStyle = {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#fff",
    marginRight: "10px",
    marginBottom: "10px"
  };

  const buttonStyle = {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    background: "#38bdf8",
    color: "#0f172a",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: "10px",
    marginBottom: "10px"
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: "#a78bfa",
    color: "#fff"
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    background: "#f87171",
    color: "#fff"
  };

  const signup = async () => {
    const res = await fetch(`${API}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    alert(data.message);
  };

  const login = async () => {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.user.name);
      setToken(data.token);
      setName(data.user.name);
    } else {
      alert(data.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    setToken(null);
    setName("");
  };

  const addTask = async () => {
    if (!task) return;

    await fetch(`${API}/add-activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: task,
        activityDate: date
      })
    });

    setTask("");
    loadTasks();
    getDaily();
    getOverall();
    getPending();
    getLast7Days();
  };

  const loadTasks = async () => {
    const res = await fetch(`${API}/activities/${date}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    setTasks(data);
  };

  const toggleTask = async (id, completed) => {
    await fetch(`${API}/toggle-activity/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        completed: !completed
      })
    });

    loadTasks();
    getDaily();
    getOverall();
    getPending();
    getLast7Days();
  };

  const deleteTask = async (id) => {
    await fetch(`${API}/delete-activity/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    loadTasks();
    getDaily();
    getOverall();
    getPending();
    getLast7Days();
  };

  const getDaily = async () => {
    const res = await fetch(`${API}/daily-progress/${date}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    setDaily(data.percentage || 0);
  };

  const getOverall = async () => {
    const res = await fetch(`${API}/overall-progress`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    setOverall(data.percentage || 0);
  };

  const getPending = async () => {
    const res = await fetch(`${API}/pending`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    setPending(data);
  };

  const getLast7Days = async () => {
    const res = await fetch(`${API}/last-7-days`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    setHistory(data);

    const grouped = {};

    data.forEach((item) => {
      const day = new Date(item.activityDate).toLocaleDateString("en-GB");
      if (!grouped[day]) {
        grouped[day] = { date: day, total: 0, completed: 0 };
      }
      grouped[day].total += 1;
      if (item.completed) grouped[day].completed += 1;
    });

    const finalChartData = Object.values(grouped).map((d) => ({
      date: d.date,
      percentage: d.total === 0 ? 0 : Number(((d.completed / d.total) * 100).toFixed(2))
    }));

    setChartData(finalChartData);
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (token) {
      loadTasks();
      getDaily();
      getOverall();
      getPending();
      getLast7Days();
    }
  }, [token, date]);
  /* eslint-enable react-hooks/exhaustive-deps */

  if (!token) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, maxWidth: "420px", margin: "60px auto" }}>
          <h2 style={{ marginBottom: "20px" }}>{isLogin ? "Login" : "Signup"}</h2>

          {!isLogin && (
            <>
              <input
                style={inputStyle}
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <br />
            </>
          )}

          <input
            style={inputStyle}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <br />

          <input
            style={inputStyle}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <br />

          {isLogin ? (
            <button style={buttonStyle} onClick={login}>Login</button>
          ) : (
            <button style={buttonStyle} onClick={signup}>Signup</button>
          )}

          <button
            style={secondaryButtonStyle}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Create Account" : "Already have account"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Task Tracker</h1>
        <h3>Welcome 👋 {name}</h3>
        <button style={dangerButtonStyle} onClick={logout}>Logout</button>
      </div>

      <div style={cardStyle}>
        <h3>Daily Tasks</h3>

        <input
          style={inputStyle}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <br />

        <input
          style={inputStyle}
          placeholder="Add task"
          value={task}
          onChange={(e) => setTask(e.target.value)}
        />

        <button style={buttonStyle} onClick={addTask}>Add</button>
        <button style={secondaryButtonStyle} onClick={loadTasks}>Load</button>

        <ul style={{ paddingLeft: "20px" }}>
          {tasks.map((t) => (
            <li key={t._id} style={{ marginBottom: "10px" }}>
              <input
                type="checkbox"
                checked={t.completed}
                onChange={() => toggleTask(t._id, t.completed)}
              />{" "}
              {t.title}
              <button
                style={{
                  marginLeft: "10px",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  cursor: "pointer"
                }}
                onClick={() => deleteTask(t._id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div style={cardStyle}>
        <h3>Daily Progress</h3>
        <p>{daily.toFixed(2)} %</p>

        <div
          style={{
            width: "100%",
            height: "20px",
            background: "#334155",
            borderRadius: "10px",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${daily}%`,
              height: "100%",
              background: daily === 100 ? "#22c55e" : "#f59e0b",
              transition: "0.5s"
            }}
          />
        </div>
      </div>

      <div style={cardStyle}>
        <h3>Overall 7 Days</h3>
        <p>{overall.toFixed(2)} %</p>
      </div>

      <div style={cardStyle}>
        <h3>Pending Tasks</h3>
        <ul style={{ paddingLeft: "20px" }}>
          {pending.map((p) => (
            <li key={p._id}>{p.title}</li>
          ))}
        </ul>
      </div>

      <div style={cardStyle}>
        <h3>Last 7 Days History</h3>
        <ul style={{ paddingLeft: "20px" }}>
          {history.map((h) => (
            <li key={h._id}>
              {new Date(h.activityDate).toLocaleDateString()} - {h.title} -{" "}
              {h.completed ? "Completed" : "Pending"}
            </li>
          ))}
        </ul>
      </div>

      <div style={cardStyle}>
        <h3>7 Days Performance Graph</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="date" stroke="#f8fafc" />
              <YAxis stroke="#f8fafc" domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="#38bdf8"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default App;