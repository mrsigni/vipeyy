"use client";

import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

type User = {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  totalEarnings: number;
  isSuspended: boolean;
  isEmailVerified: boolean;
  createdAt: string;
};

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/guser");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  const handleSuspendConfirm = async () => {
    if (!selectedUserId) return;

    const res = await fetch("/api/admin/suspend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: selectedUserId }),
    });

    if (res.ok) {
      setShowModal(false);
      setSelectedUserId(null);
      fetchUsers();
    } else {
      alert("Gagal menyuspend user.");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Manajemen User" />
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03] xl:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Daftar User
          </h2>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Total: {users.length}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Memuat data...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada user terdaftar.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/30">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-white">
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-white">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-white">
                      WhatsApp
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-white">
                      Earnings
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-white">
                      Verifikasi
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-white">
                      Gabung
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-white">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                        {user.fullName}
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                        {user.whatsapp}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200">
                        ${user.totalEarnings.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-800 dark:text-gray-200">
                        {user.isEmailVerified ? "✅" : "❌"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setShowModal(true);
                          }}
                          className={
                            user.isSuspended
                              ? "text-yellow-600 hover:text-yellow-800 dark:hover:text-yellow-400"
                              : "text-red-600 hover:text-red-800 dark:hover:text-red-400"
                          }
                          title={
                            user.isSuspended
                              ? "Unsuspend user"
                              : "Suspend user"
                          }
                        >
                          <Ban className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-center mt-4 space-x-2 flex-wrap">
              {/* Prev button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>

              {/* Mobile → hanya current/total */}
              <span className="px-3 py-1 border rounded bg-blue-600 text-white sm:hidden">
                {currentPage} / {totalPages}
              </span>

              {/* Desktop → tampil semua nomor halaman */}
              <div className="hidden sm:flex space-x-2 flex-wrap">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 border rounded ${
                        currentPage === page ? "bg-blue-600 text-white" : ""
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              {/* Next button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal konfirmasi suspend/unsuspend */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white dark:bg-gray-900 p-6 w-full max-w-sm shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {users.find((u) => u.id === selectedUserId)?.isSuspended
                ? "Konfirmasi Unsuspend"
                : "Konfirmasi Suspend"}
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              {users.find((u) => u.id === selectedUserId)?.isSuspended
                ? "Yakin ingin mengaktifkan kembali user ini?"
                : "Apakah kamu yakin ingin suspend user ini?"}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm rounded-md border dark:border-gray-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Batal
              </button>
              <button
                onClick={handleSuspendConfirm}
                className={`px-4 py-2 text-sm rounded-md text-white ${
                  users.find((u) => u.id === selectedUserId)?.isSuspended
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {users.find((u) => u.id === selectedUserId)?.isSuspended
                  ? "Unsuspend"
                  : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
