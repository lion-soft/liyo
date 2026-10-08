
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Customers() {
    const [customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);

    const [businessId, setBusinessId] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        status: "Active",
    });

    // Get current user's business
    const getBusiness = async () => {
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        const user = session?.user;

        if (!user) {
            throw new Error("User is not logged in.");
        }

        const { data, error } = await supabase
            .from("businesses")
            .select("id")
            .eq("owner_id", user.id)
            .single();

        if (error) {
            throw error;
        }

        return data.id;
    };

    // Load customers and orders
    const loadData = async () => {
        try {
            setLoading(true);
            setErrorMessage("");

            const id = await getBusiness();

            setBusinessId(id);

            const [customersResult, ordersResult] =
                await Promise.all([
                    supabase
                        .from("customers")
                        .select(
                            "id, name, phone, email, status, created_at"
                        )
                        .eq("business_id", id)
                        .order("created_at", {
                            ascending: true,
                        }),

                    supabase
                        .from("orders")
                        .select(
                            "id, customer_id, amount, created_at"
                        )
                        .eq("business_id", id),
                ]);

            if (customersResult.error) {
                throw customersResult.error;
            }

            if (ordersResult.error) {
                throw ordersResult.error;
            }

            setCustomers(customersResult.data || []);
            setOrders(ordersResult.data || []);
        } catch (error) {
            console.error("Customers load error:", error);
            setErrorMessage(
                error.message || "Unable to load customers."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm({
            ...form,
            [name]: value,
        });
    };

    const resetForm = () => {
        setForm({
            name: "",
            phone: "",
            email: "",
            status: "Active",
        });

        setEditId(null);
        setShowForm(false);
        setErrorMessage("");
    };

    const saveCustomer = async (e) => {
        e.preventDefault();

        if (!form.name.trim() || !form.phone.trim()) {
            setErrorMessage(
                "Please enter customer name and phone number."
            );
            return;
        }

        if (!businessId) {
            setErrorMessage("Business profile not found.");
            return;
        }

        try {
            setSaving(true);
            setErrorMessage("");

            const customerData = {
                name: form.name.trim(),
                phone: form.phone.trim(),
                email: form.email.trim() || null,
                status: form.status,
            };

            if (editId) {
                // UPDATE
                const { data, error } = await supabase
                    .from("customers")
                    .update(customerData)
                    .eq("id", editId)
                    .eq("business_id", businessId)
                    .select(
                        "id, name, phone, email, status, created_at"
                    )
                    .single();

                if (error) {
                    throw error;
                }

                setCustomers((current) =>
                    current.map((customer) =>
                        customer.id === editId
                            ? data
                            : customer
                    )
                );
            } else {
                // INSERT
                const { data, error } = await supabase
                    .from("customers")
                    .insert([
                        {
                            business_id: businessId,
                            ...customerData,
                        },
                    ])
                    .select(
                        "id, name, phone, email, status, created_at"
                    )
                    .single();

                if (error) {
                    throw error;
                }

                setCustomers((current) => [
                    ...current,
                    data,
                ]);
            }

            resetForm();
        } catch (error) {
            console.error(
                "Save customer error:",
                error
            );

            setErrorMessage(
                error.message ||
                    "Unable to save customer."
            );
        } finally {
            setSaving(false);
        }
    };

    const editCustomer = (customer) => {
        setForm({
            name: customer.name || "",
            phone: customer.phone || "",
            email: customer.email || "",
            status: customer.status || "Active",
        });

        setEditId(customer.id);
        setErrorMessage("");
        setShowForm(true);
    };

    const deleteCustomer = async (customer) => {
        const confirmed = window.confirm(
            `Delete ${customer.name}?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setErrorMessage("");

            const { error } = await supabase
                .from("customers")
                .delete()
                .eq("id", customer.id)
                .eq("business_id", businessId);

            if (error) {
                throw error;
            }

            setCustomers((current) =>
                current.filter(
                    (item) => item.id !== customer.id
                )
            );

            // Remove related orders from local state
            // only if the database allows customer deletion.
            setOrders((current) =>
                current.filter(
                    (order) =>
                        order.customer_id !== customer.id
                )
            );
        } catch (error) {
            console.error(
                "Delete customer error:",
                error
            );

            setErrorMessage(
                error.message ||
                    "Unable to delete customer."
            );
        }
    };

    const getCustomerOrders = (customerId) => {
        return orders.filter(
            (order) =>
                order.customer_id === customerId
        );
    };

    const getCustomerSpent = (customerId) => {
        return getCustomerOrders(customerId).reduce(
            (total, order) =>
                total + Number(order.amount || 0),
            0
        );
    };

    const filteredCustomers = customers.filter(
        (customer) =>
            `${customer.name} ${customer.phone} ${
                customer.email || ""
            }`
                .toLowerCase()
                .includes(search.toLowerCase())
    );

    const totalCustomers = customers.length;

    const activeCustomers = customers.filter(
        (customer) =>
            customer.status === "Active"
    ).length;

    const currentMonth = new Date()
        .toISOString()
        .slice(0, 7);

    const newThisMonth = customers.filter(
        (customer) =>
            customer.created_at?.startsWith(
                currentMonth
            )
    ).length;

    const totalRevenue = orders.reduce(
        (total, order) =>
            total + Number(order.amount || 0),
        0
    );

    return (
        <div className="page customers-page">
            {/* HEADER */}

            <div className="page-header">
                <div>
                    <span className="label">
                        BUSINESS MANAGEMENT
                    </span>

                    <h1>Customers</h1>

                    <p>
                        Manage your customers and their
                        business activity.
                    </p>
                </div>

                <button
                    className="primary-btn"
                    onClick={() => {
                        setEditId(null);

                        setForm({
                            name: "",
                            phone: "",
                            email: "",
                            status: "Active",
                        });

                        setErrorMessage("");
                        setShowForm(true);
                    }}
                >
                    + Add Customer
                </button>
            </div>

            {/* ERROR */}

            {errorMessage && (
                <div
                    style={{
                        marginBottom: "18px",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        background:
                            "rgba(255, 70, 70, 0.1)",
                        border:
                            "1px solid rgba(255, 70, 70, 0.25)",
                        color: "#ff8d8d",
                    }}
                >
                    {errorMessage}
                </div>
            )}

            {/* STATS */}

            <div className="order-stats">
                <div className="mini-card">
                    <span>Total Customers</span>

                    <strong>
                        {totalCustomers}
                    </strong>
                </div>

                <div className="mini-card">
                    <span>New This Month</span>

                    <strong>
                        {newThisMonth}
                    </strong>
                </div>

                <div className="mini-card">
                    <span>Active Customers</span>

                    <strong>
                        {activeCustomers}
                    </strong>
                </div>

                <div className="mini-card">
                    <span>Total Revenue</span>

                    <strong>
                        Rs.{" "}
                        {totalRevenue.toLocaleString()}
                    </strong>
                </div>
            </div>

            {/* CUSTOMER TABLE */}

            <div className="panel orders-table-panel">
                <div className="panel-header">
                    <div>
                        <span className="label">
                            CUSTOMER DATABASE
                        </span>

                        <h2>All Customers</h2>
                    </div>

                    <input
                        className="search"
                        placeholder="Search customers..."
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
                                <th>Customer</th>
                                <th>Phone</th>
                                <th>Orders</th>
                                <th>Total Spent</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="6"
                                        style={{
                                            textAlign:
                                                "center",
                                            padding: "40px",
                                        }}
                                    >
                                        Loading customers...
                                    </td>
                                </tr>
                            ) : filteredCustomers.length >
                              0 ? (
                                filteredCustomers.map(
                                    (customer) => {
                                        const customerOrders =
                                            getCustomerOrders(
                                                customer.id
                                            );

                                        const totalSpent =
                                            getCustomerSpent(
                                                customer.id
                                            );

                                        return (
                                            <tr
                                                key={
                                                    customer.id
                                                }
                                            >
                                                <td>
                                                    <strong>
                                                        {
                                                            customer.name
                                                        }
                                                    </strong>

                                                    {customer.email && (
                                                        <small
                                                            style={{
                                                                display:
                                                                    "block",
                                                                color:
                                                                    "#71839a",
                                                                marginTop:
                                                                    "4px",
                                                            }}
                                                        >
                                                            {
                                                                customer.email
                                                            }
                                                        </small>
                                                    )}
                                                </td>

                                                <td>
                                                    {
                                                        customer.phone
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        customerOrders.length
                                                    }
                                                </td>

                                                <td>
                                                    Rs.{" "}
                                                    {totalSpent.toLocaleString()}
                                                </td>

                                                <td>
                                                    <b
                                                        className={
                                                            customer.status ===
                                                            "Active"
                                                                ? "paid"
                                                                : "pending"
                                                        }
                                                    >
                                                        {
                                                            customer.status
                                                        }
                                                    </b>
                                                </td>

                                                <td>
                                                    <div className="product-actions">
                                                        <button
                                                            className="edit-btn"
                                                            onClick={() =>
                                                                editCustomer(
                                                                    customer
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            className="delete-btn"
                                                            onClick={() =>
                                                                deleteCustomer(
                                                                    customer
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )
                            ) : (
                                <tr>
                                    <td
                                        colSpan="6"
                                        style={{
                                            textAlign:
                                                "center",
                                            padding: "40px",
                                            color:
                                                "#71839a",
                                        }}
                                    >
                                        No customers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD / EDIT CUSTOMER MODAL */}

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div>
                                <span className="label">
                                    CUSTOMER MANAGEMENT
                                </span>

                                <h2>
                                    {editId
                                        ? "Edit Customer"
                                        : "Add Customer"}
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
                            onSubmit={saveCustomer}
                        >
                            <label>
                                Customer Name

                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Amal Perera"
                                />
                            </label>

                            <label>
                                Phone Number

                                <input
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="077 123 4567"
                                />
                            </label>

                            <label>
                                Email

                                <input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="customer@email.com"
                                />
                            </label>

                            <label>
                                Customer Status

                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    className="modal-select"
                                >
                                    <option value="Active">
                                        Active
                                    </option>

                                    <option value="Inactive">
                                        Inactive
                                    </option>
                                </select>
                            </label>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={
                                        resetForm
                                    }
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
                                        : editId
                                        ? "Save Changes"
                                        : "Add Customer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Customers;
