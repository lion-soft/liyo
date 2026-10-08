
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

function Analytics() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (businessError) {
        throw businessError;
      }

      if (!business) {
        throw new Error(
          "Unable to find your business profile."
        );
      }

      // Load all analytics data
      const [
        ordersResult,
        customersResult,
        productsResult,
        expensesResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, order_number, customer_id, product_id, quantity, amount, status, created_at"
          )
          .eq("business_id", business.id)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("customers")
          .select(
            "id, name, phone, email, status, created_at"
          )
          .eq("business_id", business.id)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("products")
          .select(
            "id, name, category, price, stock, created_at"
          )
          .eq("business_id", business.id)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("expenses")
          .select(
            "id, title, category, amount, payment, created_at"
          )
          .eq("business_id", business.id)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      if (customersResult.error) {
        throw customersResult.error;
      }

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (expensesResult.error) {
        throw expensesResult.error;
      }

      const customersData =
        customersResult.data || [];

      const productsData =
        productsResult.data || [];

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

      const mappedOrders = (
        ordersResult.data || []
      ).map((order) => ({
        ...order,

        customer:
          customerMap[order.customer_id] ||
          "Walk-in Customer",

        product:
          productMap[order.product_id] ||
          "Product",
      }));

      setOrders(mappedOrders);
      setCustomers(customersData);
      setProducts(productsData);
      setExpenses(
        expensesResult.data || []
      );
    } catch (err) {
      console.error(
        "Analytics load error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load analytics data."
      );
    } finally {
      setLoading(false);
    }
  };

  const totalSales = useMemo(() => {
    return orders.reduce(
      (total, order) =>
        total + Number(order.amount || 0),
      0
    );
  }, [orders]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );
  }, [expenses]);

  const totalProfit =
    totalSales - totalExpenses;

  const totalOrders = orders.length;

  const averageOrderValue =
    totalOrders > 0
      ? totalSales / totalOrders
      : 0;

  const profitMargin =
    totalSales > 0
      ? (totalProfit / totalSales) * 100
      : 0;

  const lowStockProducts =
    products.filter(
      (product) =>
        Number(product.stock || 0) > 0 &&
        Number(product.stock || 0) <= 10
    );

  const outOfStockProducts =
    products.filter(
      (product) =>
        Number(product.stock || 0) === 0
    );

  /*
   * PRODUCT PERFORMANCE
   */

  const productPerformance = useMemo(() => {
    const data = {};

    orders.forEach((order) => {
      const productId =
        order.product_id;

      const name =
        order.product || "Product";

      if (!data[productId || name]) {
        data[productId || name] = {
          name,
          quantity: 0,
          revenue: 0,
        };
      }

      data[productId || name].quantity +=
        Number(order.quantity || 0);

      data[productId || name].revenue +=
        Number(order.amount || 0);
    });

    return Object.values(data)
      .sort(
        (a, b) =>
          b.quantity - a.quantity
      )
      .slice(0, 5);
  }, [orders]);

  /*
   * CUSTOMER PERFORMANCE
   */

  const customerPerformance = useMemo(() => {
    const data = {};

    orders.forEach((order) => {
      const customerId =
        order.customer_id;

      const name =
        order.customer ||
        "Walk-in Customer";

      const key =
        customerId || name;

      if (!data[key]) {
        data[key] = {
          name,
          orders: 0,
          spent: 0,
        };
      }

      data[key].orders += 1;

      data[key].spent +=
        Number(order.amount || 0);
    });

    return Object.values(data)
      .sort(
        (a, b) =>
          b.spent - a.spent
      )
      .slice(0, 5);
  }, [orders]);

  /*
   * MONTHLY SALES
   */

  const monthlySales = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const result = months.map(
      (month) => ({
        month,
        sales: 0,
      })
    );

    orders.forEach((order) => {
      if (!order.created_at) {
        return;
      }

      const date = new Date(
        order.created_at
      );

      if (isNaN(date.getTime())) {
        return;
      }

      const month =
        date.getMonth();

      result[month].sales +=
        Number(order.amount || 0);
    });

    return result;
  }, [orders]);

  const maxMonthlySales = Math.max(
    ...monthlySales.map(
      (item) => item.sales
    ),
    1
  );

  /*
   * CURRENT MONTH
   */

  const currentMonthSales =
    orders
      .filter((order) => {
        if (!order.created_at) {
          return false;
        }

        const date = new Date(
          order.created_at
        );

        const now = new Date();

        return (
          date.getMonth() ===
            now.getMonth() &&
          date.getFullYear() ===
            now.getFullYear()
        );
      })
      .reduce(
        (total, order) =>
          total +
          Number(order.amount || 0),
        0
      );

  const currentMonthExpenses =
    expenses
      .filter((expense) => {
        if (!expense.created_at) {
          return false;
        }

        const date = new Date(
          expense.created_at
        );

        const now = new Date();

        return (
          date.getMonth() ===
            now.getMonth() &&
          date.getFullYear() ===
            now.getFullYear()
        );
      })
      .reduce(
        (total, expense) =>
          total +
          Number(expense.amount || 0),
        0
      );

  const currentMonthProfit =
    currentMonthSales -
    currentMonthExpenses;

  /*
   * CUSTOMER GROWTH
   */

  const currentMonthCustomers =
    customers.filter(
      (customer) => {
        if (!customer.created_at) {
          return false;
        }

        const date = new Date(
          customer.created_at
        );

        const now = new Date();

        return (
          date.getMonth() ===
            now.getMonth() &&
          date.getFullYear() ===
            now.getFullYear()
        );
      }
    ).length;

  /*
   * LOADING
   */

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
          Loading analytics...
        </div>
      </div>
    );
  }

  /*
   * ERROR
   */

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <span className="label">
              BUSINESS ANALYTICS
            </span>

            <h1>
              Analytics
            </h1>

            <p>
              Understand your business
              performance with real data.
            </p>
          </div>

          <button
            className="profile-btn"
            onClick={loadData}
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
            Unable to load analytics
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
            onClick={loadData}
          >
            Try Again →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* HEADER */}

      <div className="page-header">
        <div>
          <span className="label">
            BUSINESS ANALYTICS
          </span>

          <h1>
            Analytics
          </h1>

          <p>
            Understand your business
            performance with real data.
          </p>
        </div>

        <button
          className="profile-btn"
          onClick={loadData}
        >
          🔄
        </button>
      </div>

      {/* TOP STATS */}

      <div className="order-stats">
        <div className="mini-card">
          <span>
            Total Sales
          </span>

          <strong>
            Rs.{" "}
            {totalSales.toLocaleString()}
          </strong>
        </div>

        <div className="mini-card">
          <span>
            Total Profit
          </span>

          <strong>
            Rs.{" "}
            {totalProfit.toLocaleString()}
          </strong>
        </div>

        <div className="mini-card">
          <span>
            Total Orders
          </span>

          <strong>
            {totalOrders}
          </strong>
        </div>

        <div className="mini-card">
          <span>
            Profit Margin
          </span>

          <strong>
            {profitMargin.toFixed(1)}%
          </strong>
        </div>
      </div>

      {/* SALES CHART */}

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="label">
              SALES PERFORMANCE
            </span>

            <h2>
              Monthly Sales
            </h2>
          </div>

          <span className="panel-value">
            Rs.{" "}
            {currentMonthSales.toLocaleString()}
          </span>
        </div>

        <div className="chart analytics-chart">
          <div className="chart-bars">
            {monthlySales.map(
              (item) => {
                const height =
                  item.sales > 0
                    ? Math.max(
                        8,
                        (item.sales /
                          maxMonthlySales) *
                          100
                      )
                    : 4;

                return (
                  <div
                    className="bar-wrap"
                    key={item.month}
                  >
                    <div
                      className="bar"
                      style={{
                        height: `${height}%`,
                      }}
                      title={`Rs. ${item.sales.toLocaleString()}`}
                    ></div>

                    <span>
                      {item.month}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* MAIN ANALYTICS */}

      <div className="content-grid">
        {/* TOP PRODUCTS */}

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="label">
                PRODUCT PERFORMANCE
              </span>

              <h2>
                Top Products
              </h2>
            </div>
          </div>

          <div className="orders">
            {productPerformance.length >
            0 ? (
              productPerformance.map(
                (product) => (
                  <div
                    className="order-row"
                    key={product.name}
                  >
                    <div>
                      <strong>
                        {product.name}
                      </strong>

                      <span>
                        {product.quantity}{" "}
                        units sold
                      </span>
                    </div>

                    <b>
                      Rs.{" "}
                      {product.revenue.toLocaleString()}
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
                No product sales data yet.
              </div>
            )}
          </div>
        </div>

        {/* TOP CUSTOMERS */}

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="label">
                CUSTOMER PERFORMANCE
              </span>

              <h2>
                Top Customers
              </h2>
            </div>
          </div>

          <div className="orders">
            {customerPerformance.length >
            0 ? (
              customerPerformance.map(
                (customer) => (
                  <div
                    className="order-row"
                    key={customer.name}
                  >
                    <div>
                      <strong>
                        {customer.name}
                      </strong>

                      <span>
                        {customer.orders}{" "}
                        orders
                      </span>
                    </div>

                    <b>
                      Rs.{" "}
                      {customer.spent.toLocaleString()}
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
                No customer activity yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BUSINESS HEALTH */}

      <div className="bottom-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="label">
                BUSINESS HEALTH
              </span>

              <h2>
                Current Performance
              </h2>
            </div>
          </div>

          <div className="orders">
            <div className="order-row">
              <div>
                <strong>
                  Average Order Value
                </strong>

                <span>
                  Average revenue per order
                </span>
              </div>

              <b>
                Rs.{" "}
                {averageOrderValue.toLocaleString(
                  undefined,
                  {
                    maximumFractionDigits: 0,
                  }
                )}
              </b>
            </div>

            <div className="order-row">
              <div>
                <strong>
                  Current Month Profit
                </strong>

                <span>
                  Sales minus expenses
                </span>
              </div>

              <b>
                Rs.{" "}
                {currentMonthProfit.toLocaleString()}
              </b>
            </div>

            <div className="order-row">
              <div>
                <strong>
                  New Customers
                </strong>

                <span>
                  Customers added this month
                </span>
              </div>

              <b>
                {currentMonthCustomers}
              </b>
            </div>
          </div>
        </div>

        {/* INVENTORY HEALTH */}

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="label">
                INVENTORY
              </span>

              <h2>
                Stock Health
              </h2>
            </div>
          </div>

          <div className="orders">
            <div className="order-row">
              <div>
                <strong>
                  Total Products
                </strong>

                <span>
                  Products in inventory
                </span>
              </div>

              <b>
                {products.length}
              </b>
            </div>

            <div className="order-row">
              <div>
                <strong>
                  Low Stock
                </strong>

                <span>
                  Products needing attention
                </span>
              </div>

              <b>
                {lowStockProducts.length}
              </b>
            </div>

            <div className="order-row">
              <div>
                <strong>
                  Out of Stock
                </strong>

                <span>
                  Products unavailable
                </span>
              </div>

              <b>
                {outOfStockProducts.length}
              </b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;