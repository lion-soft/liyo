
import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";

import { supabase } from "./lib/supabase";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Analytics from "./pages/Analytics";
import Expenses from "./pages/Expenses";
import Invoices from "./pages/Invoices";
import LiyoAI from "./pages/LiyoAI";
import Settings from "./pages/Settings";

import "./App.css";

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#050b14",
        color: "#ffffff",
        fontSize: "16px",
        fontWeight: "600",
      }}
    >
      Loading LIYO...
    </div>
  );
}

function AppLayout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">L</div>

          <div>
            <h2>LIYO</h2>
            <span>Business Manager</span>
          </div>
        </div>

        <nav>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <span>⌂</span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/orders"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <span>◫</span>
            <span>Orders</span>
          </NavLink>

          <NavLink
            to="/customers"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <span>♙</span>
            <span>Customers</span>
          </NavLink>

          <NavLink
            to="/products"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <span>▣</span>
            <span>Products</span>
          </NavLink>

          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <span>▥</span>
            <span>Analytics</span>
          </NavLink>

          <NavLink
            to="/expenses"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <span>◈</span>
            <span>Expenses</span>
          </NavLink>

          <NavLink
            to="/invoices"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <span>▤</span>
            <span>Invoices</span>
          </NavLink>

          <NavLink
            to="/ai"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <span>✦</span>
            <span>LIYO AI</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <span>⚙</span>
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/products" element={<Products />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/ai" element={<LiyoAI />} />
          <Route path="/settings" element={<Settings />} />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>
    </div>
  );
}

function ProtectedRoute() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            "Supabase session error:",
            error
          );
        }

        if (!mounted) return;

        setSession(session ?? null);
        setLoading(false);
      } catch (error) {
        console.error(
          "Authentication check failed:",
          error
        );

        if (!mounted) return;

        setSession(null);
        setLoading(false);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <Navigate
        to="/auth"
        replace
      />
    );
  }

  return <AppLayout />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={<Auth />}
        />

        <Route
          path="/*"
          element={<ProtectedRoute />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;