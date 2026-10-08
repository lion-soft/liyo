import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Invoices() {
  const location = useLocation();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);

  const [businessId, setBusinessId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState(null);

  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    customer: "",
    amount: "",
    status: "Pending",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getErrorMessage = (err) => {
    return (
      err?.message ||
      err?.details ||
      err?.hint ||
      "Something went wrong. Please try again."
    );
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";

    const date = new Date(dateValue);
    const today = new Date();
    const yesterday = new Date();

    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("You are not logged in.");
      }

      const {
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (businessError) throw businessError;

      if (!business) {
        throw new Error("Unable to find your business profile.");
      }

      setBusinessId(business.id);

      const {
        data: customersData,
        error: customersError,
      } = await supabase
        .from("customers")
        .select("id, name, phone, email, status, created_at")
        .eq("business_id", business.id)
        .order("created_at", { ascending: true });

      if (customersError) throw customersError;

      const {
        data: ordersData,
        error: ordersError,
      } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_id, amount, status, created_at"
        )
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      const {
        data: invoicesData,
        error: invoicesError,
      } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, order_id, customer_id, amount, status, created_at"
        )
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (invoicesError) throw invoicesError;

      const customerMap = new Map(
        (customersData || []).map((customer) => [
          customer.id,
          customer,
        ])
      );

      const orderMap = new Map(
        (ordersData || []).map((order) => [
          order.id,
          order,
        ])
      );

      const formattedInvoices = (invoicesData || []).map(
        (invoice) => {
          const customer = customerMap.get(invoice.customer_id);
          const order = orderMap.get(invoice.order_id);

          return {
            ...invoice,
            customer_id: invoice.customer_id,
            customer:
              customer?.name || "Unknown Customer",
            order: order || null,
            id: invoice.id,
            displayId: `#INV-${invoice.invoice_number}`,
            date: formatDate(invoice.created_at),
          };
        }
      );

      setCustomers(customersData || []);
      setOrders(ordersData || []);
      setInvoices(formattedInvoices);
    } catch (err) {
      console.error("Invoice load error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      customer: "",
      amount: "",
      status: "Pending",
    });

    setEditInvoiceId(null);
    setShowForm(false);
    setError("");
  };

  const generateInvoiceNumber = () => {
    const numbers = invoices
      .map((invoice) => Number(invoice.invoice_number))
      .filter(
        (number) =>
          Number.isFinite(number) && number > 0
      );

    const highest =
      numbers.length > 0
        ? Math.max(...numbers)
        : 1000;

    return highest + 1;
  };

  const createInvoice = async (e) => {
    e.preventDefault();

    if (saving) return;

    setError("");

    if (!businessId) {
      setError("Business profile was not found.");
      return;
    }

    if (!form.customer) {
      setError("Please select a customer.");
      return;
    }

    if (
      !form.amount ||
      Number(form.amount) <= 0
    ) {
      setError("Please enter a valid amount.");
      return;
    }

    try {
      setSaving(true);

      const amount = Number(form.amount);

      if (editInvoiceId) {
        const {
          error: updateError,
        } = await supabase
          .from("invoices")
          .update({
            customer_id: form.customer,
            amount,
            status: form.status,
          })
          .eq("id", editInvoiceId)
          .eq("business_id", businessId);

        if (updateError) throw updateError;

        await loadData();
        resetForm();

        return;
      }

      const nextInvoiceNumber =
        generateInvoiceNumber();

      const {
        error: insertError,
      } = await supabase
        .from("invoices")
        .insert({
          business_id: businessId,
          invoice_number: nextInvoiceNumber,
          customer_id: form.customer,
          amount,
          status: form.status,
          order_id: null,
        });

      if (insertError) throw insertError;

      await loadData();
      resetForm();
    } catch (err) {
      console.error(
        "Invoice save error:",
        err
      );

      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const editInvoice = (invoice) => {
    setForm({
      customer: invoice.customer_id || "",
      amount: invoice.amount || "",
      status: invoice.status || "Pending",
    });

    setEditInvoiceId(invoice.id);
    setShowForm(true);
    setError("");
  };

  const deleteInvoice = async (invoice) => {
    const confirmed = window.confirm(
      `Delete ${invoice.displayId}?`
    );

    if (!confirmed) return;

    try {
      setError("");

      const {
        error: deleteError,
      } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoice.id)
        .eq("business_id", businessId);

      if (deleteError) throw deleteError;

      setInvoices((previous) =>
        previous.filter(
          (item) => item.id !== invoice.id
        )
      );
    } catch (err) {
      console.error(
        "Invoice delete error:",
        err
      );

      setError(getErrorMessage(err));
    }
  };

  /*
    CREATE INVOICE DIRECTLY FROM ORDER
  */
  const createFromOrder = async (order) => {
    if (!businessId || !order) return;

    try {
      setError("");

      const {
        data: existingInvoice,
        error: existingError,
      } = await supabase
        .from("invoices")
        .select("id")
        .eq("business_id", businessId)
        .eq("order_id", order.id)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingInvoice) {
        alert(
          "An invoice already exists for this order."
        );

        return;
      }

      const nextInvoiceNumber =
        generateInvoiceNumber();

      const {
        error: insertError,
      } = await supabase
        .from("invoices")
        .insert({
          business_id: businessId,
          invoice_number: nextInvoiceNumber,
          order_id: order.id,
          customer_id:
            order.customer_id || null,
          amount: Number(order.amount),
          status: order.status || "Pending",
        });

      if (insertError) {
        throw insertError;
      }

      await loadData();
    } catch (err) {
      console.error(
        "Create invoice from order error:",
        err
      );

      setError(getErrorMessage(err));
    }
  };

  /*
    WHEN ORDERS PAGE SENDS AN ORDER HERE,
    AUTOMATICALLY CREATE ITS INVOICE.
  */
  useEffect(() => {
    const order =
      location.state?.createFromOrder
        ? location.state.order
        : null;

    if (!order || !businessId) {
      return;
    }

    const processOrder = async () => {
      await createFromOrder(order);

      navigate("/invoices", {
        replace: true,
        state: {},
      });
    };

    processOrder();
  }, [
    businessId,
    location.state,
    navigate,
  ]);

  const filteredInvoices =
    invoices.filter((invoice) =>
      `${invoice.displayId} ${invoice.customer} ${invoice.status}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  const totalInvoices = invoices.length;

  const paidInvoices =
    invoices.filter(
      (invoice) =>
        invoice.status === "Paid"
    ).length;

  const pendingInvoices =
    invoices.filter(
      (invoice) =>
        invoice.status === "Pending"
    ).length;

  const totalAmount =
    invoices.reduce(
      (total, invoice) =>
        total +
        Number(invoice.amount || 0),
      0
    );

  if (loading) {
    return (
      <div className="page">
        <div
          style={{
            padding: "60px",
            textAlign: "center",
            color: "#71839a",
          }}
        >
          Loading invoices...
        </div>
      </div>
    );
  }

  return (
    <div className="page invoices-page">

      <div className="page-header">
        <div>
          <span className="label">
            BUSINESS MANAGEMENT
          </span>

          <h1>Invoices</h1>

          <p>
            Create, manage and track your business
            invoices.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => {
            setEditInvoiceId(null);

            setForm({
              customer: "",
              amount: "",
              status: "Pending",
            });

            setError("");
            setShowForm(true);
          }}
        >
          + Create Invoice
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 16px",
            borderRadius: "10px",
            background:
              "rgba(255, 80, 80, 0.10)",
            border:
              "1px solid rgba(255, 80, 80, 0.25)",
            color: "#ff8d8d",
          }}
        >
          {error}
        </div>
      )}

      <div className="order-stats">

        <div className="mini-card">
          <span>Total Invoices</span>
          <strong>
            {totalInvoices}
          </strong>
        </div>

        <div className="mini-card">
          <span>Paid</span>
          <strong>
            {paidInvoices}
          </strong>
        </div>

        <div className="mini-card">
          <span>Pending</span>
          <strong>
            {pendingInvoices}
          </strong>
        </div>

        <div className="mini-card">
          <span>Total Amount</span>

          <strong>
            Rs.{" "}
            {totalAmount.toLocaleString()}
          </strong>
        </div>

      </div>

      <div className="panel orders-table-panel">

        <div className="panel-header">

          <div>
            <span className="label">
              INVOICE RECORDS
            </span>

            <h2>Recent Invoices</h2>
          </div>

          <input
            className="search"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

        <div className="table-wrapper">

          <table>

            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {filteredInvoices.length > 0 ? (
                filteredInvoices.map(
                  (invoice) => (
                    <tr key={invoice.id}>

                      <td>
                        {invoice.displayId}
                      </td>

                      <td>
                        {invoice.customer}
                      </td>

                      <td>
                        {invoice.date}
                      </td>

                      <td>
                        Rs.{" "}
                        {Number(
                          invoice.amount
                        ).toLocaleString()}
                      </td>

                      <td>
                        <b
                          className={
                            invoice.status ===
                            "Paid"
                              ? "paid"
                              : "pending"
                          }
                        >
                          {invoice.status}
                        </b>
                      </td>

                      <td>

                        <div className="product-actions">

                          <button
                            className="edit-btn"
                            onClick={() =>
                              editInvoice(
                                invoice
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              deleteInvoice(
                                invoice
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>
                  )
                )
              ) : (
                <tr>

                  <td
                    colSpan="6"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#71839a",
                    }}
                  >
                    No invoices found.
                  </td>

                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

      {showForm && (
        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>

                <span className="label">
                  INVOICE MANAGEMENT
                </span>

                <h2>
                  {editInvoiceId
                    ? "Edit Invoice"
                    : "Create Invoice"}
                </h2>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={resetForm}
              >
                ×
              </button>

            </div>

            <form
              onSubmit={createInvoice}
            >

              <label>
                Customer

                <select
                  name="customer"
                  value={form.customer}
                  onChange={handleChange}
                  className="modal-select"
                  disabled={saving}
                >

                  <option value="">
                    Select Customer
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.name}
                      </option>
                    )
                  )}

                  {customers.length === 0 && (
                    <option
                      value=""
                      disabled
                    >
                      No customers found
                    </option>
                  )}

                </select>

              </label>

              <label>
                Amount

                <input
                  name="amount"
                  type="number"
                  min="1"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="4500"
                  disabled={saving}
                />

              </label>

              <label>
                Payment Status

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="modal-select"
                  disabled={saving}
                >

                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Paid">
                    Paid
                  </option>

                </select>

              </label>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editInvoiceId
                      ? "Save Changes"
                      : "Create Invoice"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default Invoices;