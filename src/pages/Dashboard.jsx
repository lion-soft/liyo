
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [business, setBusiness] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You are not logged in.");
      }

      // Get business
      const {
        data: businessData,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("id, name, email, phone")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (businessError) {
        throw businessError;
      }

      if (!businessData) {
        throw new Error("Unable to find your business profile.");
      }

      setBusiness(businessData);

      // Load all dashboard data
      const [
        ordersResult,
        customersResult,
        expensesResult,
        productsResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, order_number, customer_id, product_id, quantity, amount, status, created_at"
          )
          .eq("business_id", businessData.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("customers")
          .select("id, name, phone, email, status, created_at")
          .eq("business_id", businessData.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("expenses")
          .select(
            "id, title, category, amount, payment, created_at"
          )
          .eq("business_id", businessData.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("products")
          .select("id, name")
          .eq("business_id", businessData.id),
      ]);

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      if (customersResult.error) {
        throw customersResult.error;
      }

      if (expensesResult.error) {
        throw expensesResult.error;
      }

      if (productsResult.error) {
        throw productsResult.error;
      }

      const customersData = customersResult.data || [];
      const productsData = productsResult.data || [];

      const customerMap = Object.fromEntries(
        customersData.map((customer) => [
          customer.id,
          customer.name,
        ])
      );

      const productMap = Object.fromEntries(
        productsData.map((product) => [
          product.id,
          product.name,
        ])
      );

      const mappedOrders = (ordersResult.data || []).map(
        (order) => ({
          ...order,
          customer:
            customerMap[order.customer_id] || "Walk-in Customer",
          product:
            productMap[order.product_id] || "Product",
          displayId: `#ORD-${order.order_number}`,
        })
      );

      setOrders(mappedOrders);
      setCustomers(customersData);
      setExpenses(expensesResult.data || []);
    } catch (err) {
      console.error("Dashboard load error:", err);

      setError(
        err?.message ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();

  const isToday = (dateValue) => {
    if (!dateValue) {
      return false;
    }

    const date = new Date(dateValue);

    return (
      date.toDateString() ===
      today.toDateString()
    );
  };

  const todayOrders = orders.filter((order) =>
    isToday(order.created_at)
  );

  const todaySales = todayOrders.reduce(
    (total, order) =>
      total + Number(order.amount || 0),
    0
  );

  const totalSales = orders.reduce(
    (total, order) =>
      total + Number(order.amount || 0),
    0
  );

  const totalExpenses = expenses.reduce(
    (total, expense) =>
      total + Number(expense.amount || 0),
    0
  );

  const totalProfit =
    totalSales - totalExpenses;

  const todayExpenses = expenses
    .filter((expense) =>
      isToday(expense.created_at)
    )
    .reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );

  const todayProfit =
    todaySales - todayExpenses;

  const recentOrders = orders.slice(0, 5);

  const paidOrders = orders.filter(
    (order) =>
      order.status === "Paid"
  ).length;

  const pendingOrders = orders.filter(
    (order) =>
      order.status === "Pending"
  ).length;

  const maxSales = Math.max(
    ...orders.map((order) =>
      Number(order.amount || 0)
    ),
    1
  );

  if (loading) {
    return (
      <div className="page">
        <div
          style={{
            minHeight: "70vh",
            display: "grid",
            placeItems: "center",
            color: "#71839a",
            fontSize: "14px",
          }}
        >
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <span className="label">
              BUSINESS OVERVIEW
            </span>

            <h1>
              Your Business Dashboard
            </h1>

            <p>
              Monitor your business performance
              and daily activity.
            </p>
          </div>

          <button
            className="profile-btn"
            onClick={loadDashboardData}
          >
            🔄
          </button>
        </div>

        <div
          className="panel"
          style={{
            padding: "30px",
            color: "#ff6b6b",
          }}
        >
          <h2>
            Unable to load dashboard
          </h2>

          <p
            style={{
              marginTop: "10px",
              color: "#aebbd0",
            }}
          >
            {error}
          </p>

          <button
            className="ai-btn"
            style={{
              marginTop: "20px",
            }}
            onClick={loadDashboardData}
          >
            Try Again →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* TOP HEADER */}

      <div className="page-header">
        <div>
          <span className="label">
            BUSINESS OVERVIEW
          </span>

          <h1>
            Your Business Dashboard
          </h1>

          <p>
            {business?.name
              ? `${business.name} — monitor your business performance and daily activity.`
              : "Monitor your business performance and daily activity."}
          </p>
        </div>

        <button
          className="profile-btn"
          onClick={() =>
            (window.location.href =
              "/settings")
          }
        >
          👋
        </button>
      </div>

      {/* STATS */}

      <div className="stats">
        <div className="stat-card">
          <div className="stat-icon">
            💰
          </div>

          <div>
            <span>
              Today's Sales
            </span>

            <strong>
              Rs.{" "}
              {todaySales.toLocaleString()}
            </strong>

            <small>
              Based on today's orders
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            📈
          </div>

          <div>
            <span>
              Today's Profit
            </span>

            <strong>
              Rs.{" "}
              {todayProfit.toLocaleString()}
            </strong>

            <small>
              Sales minus today's expenses
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            📦
          </div>

          <div>
            <span>
              Orders
            </span>

            <strong>
              {orders.length}
            </strong>

            <small>
              {pendingOrders} pending
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            👥
          </div>

          <div>
            <span>
              Customers
            </span>

            <strong>
              {customers.length}
            </strong>

            <small>
              Registered customers
            </small>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}

      <div className="content-grid">
        {/* SALES OVERVIEW */}

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="label">
                PERFORMANCE
              </span>

              <h2>
                Sales Overview
              </h2>
            </div>

            <span className="panel-value">
              Rs.{" "}
              {totalSales.toLocaleString()}
            </span>
          </div>

          <div className="chart">
            {orders.length > 0 ? (
              <div className="chart-bars">
                {orders
                  .slice(0, 8)
                  .reverse()
                  .map(
                    (order, index) => {
                      const amount =
                        Number(
                          order.amount || 0
                        );

                      const height =
                        Math.max(
                          10,
                          (amount /
                            maxSales) *
                            100
                        );

                      return (
                        <div
                          className="bar-wrap"
                          key={`${order.id}-${index}`}
                        >
                          <div
                            className="bar"
                            style={{
                              height: `${height}%`,
                            }}
                            title={`Rs. ${amount.toLocaleString()}`}
                          ></div>

                          <span>
                            {String(
                              order.order_number
                            ).slice(-3)}
                          </span>
                        </div>
                      );
                    }
                  )}
              </div>
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  color: "#71839a",
                  fontSize: "12px",
                }}
              >
                No sales data yet.
              </div>
            )}
          </div>
        </div>

        {/* LIYO AI */}

        <div className="panel ai-panel">
          <div className="ai-glow"></div>

          <span className="label">
            LIYO INTELLIGENCE
          </span>

          <h2>
            Ask LIYO AI
          </h2>

          <p>
            Get intelligent insights about
            your sales, customers and
            business performance.
          </p>

          <div className="ai-stat">
            <span>
              Estimated Profit
            </span>

            <strong>
              Rs.{" "}
              {totalProfit.toLocaleString()}
            </strong>
          </div>

          <button
            className="ai-btn"
            onClick={() =>
              (window.location.href =
                "/ai")
            }
          >
            Ask LIYO
            <span>→</span>
          </button>
        </div>
      </div>

      {/* BOTTOM GRID */}

      <div className="bottom-grid">
        {/* RECENT ORDERS */}

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="label">
                RECENT ACTIVITY
              </span>

              <h2>
                Recent Orders
              </h2>
            </div>

            <span className="panel-value">
              {orders.length}
            </span>
          </div>

          <div className="orders">
            {recentOrders.length > 0 ? (
              recentOrders.map(
                (order) => (
                  <div
                    className="order-row"
                    key={order.id}
                  >
                    <div>
                      <strong>
                        {order.customer}
                      </strong>

                      <span>
                        {order.displayId} •{" "}
                        {order.product}
                      </span>
                    </div>

                    <b>
                      Rs.{" "}
                      {Number(
                        order.amount || 0
                      ).toLocaleString()}
                    </b>
                  </div>
                )
              )
            ) : (
              <div
                style={{
                  padding: "30px 10px",
                  textAlign: "center",
                  color: "#71839a",
                  fontSize: "12px",
                }}
              >
                No orders yet.
              </div>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS */}

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="label">
                QUICK ACTIONS
              </span>

              <h2>
                Manage Business
              </h2>
            </div>
          </div>

          <div className="quick-actions">
            <button
              onClick={() =>
                (window.location.href =
                  "/orders")
              }
            >
              <span>＋</span>
              New Order
            </button>

            <button
              onClick={() =>
                (window.location.href =
                  "/customers")
              }
            >
              <span>👤</span>
              Customer
            </button>

            <button
              onClick={() =>
                (window.location.href =
                  "/products")
              }
            >
              <span>📦</span>
              Product
            </button>

            <button
              onClick={() =>
                (window.location.href =
                  "/expenses")
              }
            >
              <span>💸</span>
              Expense
            </button>
          </div>
        </div>
      </div>

      {/* BUSINESS SUMMARY */}

      <div
        className="panel"
        style={{
          marginTop: "20px",
        }}
      >
        <div className="panel-header">
          <div>
            <span className="label">
              BUSINESS SUMMARY
            </span>

            <h2>
              Current Overview
            </h2>
          </div>
        </div>

        <div className="quick-actions">
          <div
            className="mini-card"
            style={{
              flex: 1,
            }}
          >
            <span>
              Total Sales
            </span>

            <strong>
              Rs.{" "}
              {totalSales.toLocaleString()}
            </strong>
          </div>

          <div
            className="mini-card"
            style={{
              flex: 1,
            }}
          >
            <span>
              Total Expenses
            </span>

            <strong>
              Rs.{" "}
              {totalExpenses.toLocaleString()}
            </strong>
          </div>

          <div
            className="mini-card"
            style={{
              flex: 1,
            }}
          >
            <span>
              Profit
            </span>

            <strong>
              Rs.{" "}
              {totalProfit.toLocaleString()}
            </strong>
          </div>

          <div
            className="mini-card"
            style={{
              flex: 1,
            }}
          >
            <span>
              Paid Orders
            </span>

            <strong>
              {paidOrders}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;