
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function LiyoAI() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [messages, setMessages] = useState([
    {
      type: "ai",
      text: [
        "Hello! I'm LIYO AI. 👋",
        "I can help you understand your sales, customers, orders and business performance.",
      ],
    },
    {
      type: "user",
      text: ["How is my business performing this month?"],
    },
    {
      type: "ai",
      text: [
        "Your business is performing well this month.",
        "I can analyze your latest orders, customers, products, expenses and invoices to give you useful business insights.",
      ],
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBusinessData();
  }, []);

  const getBusiness = async () => {
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

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError) {
      throw businessError;
    }

    if (!business) {
      throw new Error("Unable to find your business profile.");
    }

    return business;
  };

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      setError("");

      const business = await getBusiness();

      const [
        ordersResult,
        customersResult,
        productsResult,
        expensesResult,
        invoicesResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, order_number, customer_id, product_id, quantity, amount, status, created_at"
          )
          .eq("business_id", business.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("customers")
          .select("id, name, phone, email, status, created_at")
          .eq("business_id", business.id)
          .order("created_at", { ascending: true }),

        supabase
          .from("products")
          .select("id, name, category, price, stock, created_at")
          .eq("business_id", business.id)
          .order("created_at", { ascending: true }),

        supabase
          .from("expenses")
          .select("id, title, category, amount, payment, created_at")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("invoices")
          .select(
            "id, invoice_number, order_id, customer_id, amount, status, created_at"
          )
          .eq("business_id", business.id)
          .order("created_at", { ascending: false }),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (customersResult.error) throw customersResult.error;
      if (productsResult.error) throw productsResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (invoicesResult.error) throw invoicesResult.error;

      setOrders(ordersResult.data || []);
      setCustomers(customersResult.data || []);
      setProducts(productsResult.data || []);
      setExpenses(expensesResult.data || []);
      setInvoices(invoicesResult.data || []);
    } catch (err) {
      console.error("LIYO AI data loading error:", err);

      setError(
        err?.message ||
          "Unable to load your business data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const totalSales = orders.reduce(
    (total, order) => total + Number(order.amount || 0),
    0
  );

  const totalExpenses = expenses.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0
  );

  const estimatedProfit = totalSales - totalExpenses;

  const paidInvoices = invoices.filter(
    (invoice) => invoice.status === "Paid"
  ).length;

  const pendingInvoices = invoices.filter(
    (invoice) => invoice.status === "Pending"
  ).length;

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.stock || 0) > 0 &&
      Number(product.stock || 0) <= 10
  );

  const outOfStockProducts = products.filter(
    (product) => Number(product.stock || 0) === 0
  );

  const getMonthRange = () => {
    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );

    return {
      start,
      end,
    };
  };

  const isCurrentMonth = (dateValue) => {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    const { start, end } = getMonthRange();

    return date >= start && date < end;
  };

  const getCurrentMonthOrders = () => {
    return orders.filter((order) =>
      isCurrentMonth(order.created_at)
    );
  };

  const getCurrentMonthExpenses = () => {
    return expenses.filter((expense) =>
      isCurrentMonth(expense.created_at)
    );
  };

  const getCurrentMonthSales = () => {
    return getCurrentMonthOrders().reduce(
      (total, order) => total + Number(order.amount || 0),
      0
    );
  };

  const getCurrentMonthExpensesTotal = () => {
    return getCurrentMonthExpenses().reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );
  };

  const getCurrentMonthProfit = () => {
    return (
      getCurrentMonthSales() -
      getCurrentMonthExpensesTotal()
    );
  };

  const getBestSellingProduct = () => {
    if (orders.length === 0) {
      return null;
    }

    const productSales = {};

    orders.forEach((order) => {
      if (!order.product_id) return;

      if (!productSales[order.product_id]) {
        productSales[order.product_id] = 0;
      }

      productSales[order.product_id] += Number(
        order.quantity || 0
      );
    });

    const bestProductEntry = Object.entries(
      productSales
    ).sort((a, b) => b[1] - a[1])[0];

    if (!bestProductEntry) {
      return null;
    }

    const [productId, quantity] = bestProductEntry;

    const product = products.find(
      (item) => item.id === productId
    );

    return {
      name: product?.name || "Unknown product",
      quantity,
    };
  };

  const getTopCustomer = () => {
    if (orders.length === 0) {
      return null;
    }

    const customerSales = {};

    orders.forEach((order) => {
      if (!order.customer_id) return;

      if (!customerSales[order.customer_id]) {
        customerSales[order.customer_id] = 0;
      }

      customerSales[order.customer_id] += Number(
        order.amount || 0
      );
    });

    const topCustomerEntry = Object.entries(
      customerSales
    ).sort((a, b) => b[1] - a[1])[0];

    if (!topCustomerEntry) {
      return null;
    }

    const [customerId, amount] = topCustomerEntry;

    const customer = customers.find(
      (item) => item.id === customerId
    );

    return {
      name: customer?.name || "Unknown customer",
      amount,
    };
  };

  const generateReply = (question) => {
    const q = question.toLowerCase().trim();

    const bestProduct = getBestSellingProduct();
    const topCustomer = getTopCustomer();

    const currentMonthOrders = getCurrentMonthOrders();
    const currentMonthSales = getCurrentMonthSales();
    const currentMonthExpenses =
      getCurrentMonthExpensesTotal();
    const currentMonthProfit = getCurrentMonthProfit();

    if (
      q.includes("best selling") ||
      q.includes("best product") ||
      q.includes("selling product")
    ) {
      if (!bestProduct) {
        return [
          "I don't have enough order data yet.",
          "Add some orders and I'll identify your best-selling product.",
        ];
      }

      return [
        `Your best-selling product is ${bestProduct.name}.`,
        `You've sold approximately ${bestProduct.quantity} units based on your current order data.`,
      ];
    }

    if (
      q.includes("this month") &&
      (q.includes("earn") ||
        q.includes("revenue") ||
        q.includes("sales") ||
        q.includes("income"))
    ) {
      return [
        `Your sales this month are Rs. ${currentMonthSales.toLocaleString()}.`,
        `You have ${currentMonthOrders.length} orders recorded this month.`,
      ];
    }

    if (
      q.includes("earn") ||
      q.includes("revenue") ||
      q.includes("sales") ||
      q.includes("income")
    ) {
      return [
        `Your recorded sales are Rs. ${totalSales.toLocaleString()}.`,
        `You currently have ${orders.length} recorded orders.`,
      ];
    }

    if (
      q.includes("this month") &&
      (q.includes("profit") ||
        q.includes("profitability"))
    ) {
      return [
        `Your estimated profit this month is Rs. ${currentMonthProfit.toLocaleString()}.`,
        `This is calculated from sales of Rs. ${currentMonthSales.toLocaleString()} minus expenses of Rs. ${currentMonthExpenses.toLocaleString()}.`,
      ];
    }

    if (
      q.includes("profit") ||
      q.includes("profitability")
    ) {
      return [
        `Your estimated profit is Rs. ${estimatedProfit.toLocaleString()}.`,
        `This is calculated from recorded sales of Rs. ${totalSales.toLocaleString()} minus expenses of Rs. ${totalExpenses.toLocaleString()}.`,
      ];
    }

    if (
      q.includes("this month") &&
      (q.includes("expense") ||
        q.includes("expenses") ||
        q.includes("spending"))
    ) {
      return [
        `Your expenses this month are Rs. ${currentMonthExpenses.toLocaleString()}.`,
        "Review your expense categories regularly to identify areas where you can reduce unnecessary spending.",
      ];
    }

    if (
      q.includes("expense") ||
      q.includes("expenses") ||
      q.includes("spending")
    ) {
      return [
        `Your recorded business expenses total Rs. ${totalExpenses.toLocaleString()}.`,
        "Review your expense categories regularly to identify areas where you can reduce unnecessary spending.",
      ];
    }

    if (
      q.includes("customer") ||
      q.includes("customers")
    ) {
      if (!topCustomer) {
        return [
          `You currently have ${customers.length} customers.`,
          "Once you record more orders, I can identify your highest-value customers.",
        ];
      }

      return [
        `You currently have ${customers.length} customers.`,
        `${topCustomer.name} is currently your highest-value customer with Rs. ${topCustomer.amount.toLocaleString()} in recorded purchases.`,
      ];
    }

    if (
      q.includes("order") ||
      q.includes("orders")
    ) {
      const pendingOrders = orders.filter(
        (order) => order.status === "Pending"
      ).length;

      const paidOrders = orders.filter(
        (order) => order.status === "Paid"
      ).length;

      return [
        `You currently have ${orders.length} recorded orders.`,
        `${pendingOrders} orders are pending and ${paidOrders} are marked as paid.`,
      ];
    }

    if (
      q.includes("invoice") ||
      q.includes("invoices")
    ) {
      return [
        `You currently have ${invoices.length} invoices.`,
        `${paidInvoices} are paid and ${pendingInvoices} are pending.`,
      ];
    }

    if (
      q.includes("stock") ||
      q.includes("inventory")
    ) {
      return [
        `You currently have ${products.length} products in your inventory.`,
        `${lowStockProducts.length} products are low in stock and ${outOfStockProducts.length} products are out of stock.`,
      ];
    }

    if (
      q.includes("business") ||
      q.includes("performance") ||
      q.includes("performing")
    ) {
      return [
        `You currently have ${orders.length} orders and ${customers.length} customers.`,
        `Recorded sales are Rs. ${totalSales.toLocaleString()} and expenses are Rs. ${totalExpenses.toLocaleString()}.`,
        `Your estimated profit is Rs. ${estimatedProfit.toLocaleString()}.`,
      ];
    }

    if (
      q.includes("hello") ||
      q.includes("hi") ||
      q.includes("hey")
    ) {
      return [
        "Hello! 👋",
        "I'm ready to help you understand your business.",
        "Ask me about sales, orders, customers, products, expenses or invoices.",
      ];
    }

    return [
      "I can help you analyze your business data.",
      "Try asking about your sales, profit, orders, customers, products, expenses or invoices.",
    ];
  };

  const sendMessage = async (messageText = input) => {
    const text = messageText.trim();

    if (!text || isTyping) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        type: "user",
        text: [text],
      },
    ]);

    setInput("");
    setIsTyping(true);

    try {
      // Refresh Supabase data before generating the answer.
      await loadBusinessData();

      setTimeout(() => {
        const reply = generateReply(text);

        setMessages((previous) => [
          ...previous,
          {
            type: "ai",
            text: reply,
          },
        ]);

        setIsTyping(false);
      }, 600);
    } catch (err) {
      console.error("LIYO AI reply error:", err);

      setMessages((previous) => [
        ...previous,
        {
          type: "ai",
          text: [
            "I couldn't analyze your business data right now.",
            "Please try again in a moment.",
          ],
        },
      ]);

      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        type: "ai",
        text: [
          "Chat cleared. 👋",
          "What would you like to know about your business?",
        ],
      },
    ]);
  };

  const suggestions = [
    "What are my best selling products?",
    "How much did I earn this month?",
    "Which customers buy the most?",
    "Where can I reduce expenses?",
  ];

  return (
    <div className="page">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <span className="label">
            LIYO INTELLIGENCE
          </span>

          <h1>LIYO AI</h1>

          <p>
            Your intelligent business assistant.
          </p>
        </div>

        <div className="ai-status">
          <span></span>
          AI Online
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "10px",
            background: "rgba(255, 70, 70, 0.08)",
            border: "1px solid rgba(255, 70, 70, 0.25)",
            color: "#ff8585",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          className="panel"
          style={{
            padding: "40px",
            textAlign: "center",
          }}
        >
          Loading your business intelligence...
        </div>
      ) : (
        <div className="ai-layout">
          {/* CHAT */}
          <div className="panel ai-chat">
            <div className="ai-chat-header">
              <div className="ai-avatar">
                ✦
              </div>

              <div>
                <strong>
                  LIYO AI
                </strong>

                <span>
                  Business Assistant
                </span>
              </div>

              <button
                className="ai-clear-btn"
                onClick={clearChat}
              >
                Clear
              </button>
            </div>

            <div className="chat-messages">
              {messages.map(
                (message, index) => (
                  <div
                    key={index}
                    className={`message ${
                      message.type === "ai"
                        ? "ai-message"
                        : "user-message"
                    }`}
                  >
                    {message.type === "ai" && (
                      <span className="message-icon">
                        ✦
                      </span>
                    )}

                    <div>
                      {message.text.map(
                        (line, lineIndex) => (
                          <p key={lineIndex}>
                            {line}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                )
              )}

              {isTyping && (
                <div className="message ai-message">
                  <span className="message-icon">
                    ✦
                  </span>

                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>

            <div className="ai-input-area">
              <input
                type="text"
                placeholder="Ask LIYO anything..."
                value={input}
                onChange={(e) =>
                  setInput(e.target.value)
                }
                onKeyDown={handleKeyDown}
                disabled={isTyping}
              />

              <button
                className="send-btn"
                onClick={() =>
                  sendMessage()
                }
                disabled={isTyping}
              >
                ➤
              </button>
            </div>
          </div>

          {/* SIDE */}
          <div className="ai-side">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <span className="label">
                    QUICK INSIGHTS
                  </span>

                  <h2>
                    Business Insights
                  </h2>
                </div>
              </div>

              <div className="insight-item">
                <span>📈</span>

                <div>
                  <strong>
                    Sales
                  </strong>

                  <p>
                    Rs.{" "}
                    {totalSales.toLocaleString()}{" "}
                    recorded sales.
                  </p>
                </div>
              </div>

              <div className="insight-item">
                <span>👥</span>

                <div>
                  <strong>
                    Customers
                  </strong>

                  <p>
                    {customers.length} customers
                    currently recorded.
                  </p>
                </div>
              </div>

              <div className="insight-item">
                <span>💰</span>

                <div>
                  <strong>
                    Profit
                  </strong>

                  <p>
                    Estimated profit:
                    {" "}
                    Rs.{" "}
                    {estimatedProfit.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="insight-item">
                <span>📦</span>

                <div>
                  <strong>
                    Inventory
                  </strong>

                  <p>
                    {lowStockProducts.length} low-stock
                    products need attention.
                  </p>
                </div>
              </div>
            </div>

            {/* SUGGESTIONS */}
            <div className="panel suggestions">
              <span className="label">
                TRY ASKING
              </span>

              {suggestions.map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() =>
                      sendMessage(suggestion)
                    }
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiyoAI;