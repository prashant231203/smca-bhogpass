"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { getDb } from "@/lib/firebase";
const db = getDb();
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Member } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit2, Check, X, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export function MemberTable({ data, onRefresh }: { data: (Member & { id: string })[], onRefresh: () => void }) {
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Member>>({});

  const columnHelper = createColumnHelper<Member & { id: string }>();

  const startEdit = useMemo(() => (row: Member & { id: string }) => {
    setEditingRow(row.id);
    setEditValues(row);
  }, []);

  const handleSave = useMemo(() => async (id: string) => {
    try {
      await updateDoc(doc(db!, "members", id), editValues as any);
      toast.success("Member updated");
      setEditingRow(null);
      onRefresh();
    } catch {
      toast.error("Update failed");
    }
  }, [editValues, onRefresh]);

  const handleDelete = useMemo(() => async (id: string) => {
    console.log("Delete attempt for:", id);
    if (!confirm("Are you sure you want to delete this member?")) return;
    try {
      await deleteDoc(doc(db!, "members", id));
      console.log("Firestore delete successful");
      toast.success("Member deleted");
      onRefresh();
    } catch (e) {
      console.error("Firestore delete error:", e);
      toast.error("Delete failed. Check console.");
    }
  }, [onRefresh]);

  const columns = useMemo(() => [
    columnHelper.accessor("membershipId", { header: "ID" }),
    columnHelper.accessor("primaryName", { header: "Name" }),
    columnHelper.accessor("email", { 
        header: "Email",
        meta: { className: "hidden sm:table-cell" }
    }),
    columnHelper.accessor("whatsapp", { 
        header: "WhatsApp",
        meta: { className: "hidden md:table-cell" }
    }),
    columnHelper.accessor("membershipType", { 
        header: "Type",
        meta: { className: "hidden lg:table-cell" }
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isEditing = editingRow === row.original.id;
        if (isEditing) {
          return (
            <div className="flex gap-2">
              <Button type="button" size="icon" variant="ghost" onClick={() => handleSave(row.original.id)}><Check className="w-4 h-4 text-emerald-600" /></Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => setEditingRow(null)}><X className="w-4 h-4 text-rose-600" /></Button>
            </div>
          );
        }
        return (
          <div className="flex gap-2">
            <Button type="button" size="icon" variant="ghost" title="WhatsApp Chat" onClick={() => window.open(`https://wa.me/${row.original.whatsapp?.replace(/[^0-9]/g, '') || ''}`, '_blank')}><MessageCircle className="w-4 h-4 text-emerald-500" /></Button>
            <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(row.original)}><Edit2 className="w-4 h-4" /></Button>
            <Button type="button" size="icon" variant="ghost" onClick={() => handleDelete(row.original.id)}><Trash2 className="w-4 h-4 text-rose-600" /></Button>
          </div>
        );
      }
    })
  ], [editingRow, startEdit, handleSave, handleDelete]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="border rounded-lg overflow-hidden w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className={`p-3 text-left font-semibold ${(header.column.columnDef.meta as any)?.className || ""}`}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className={`p-3 ${(cell.column.columnDef.meta as any)?.className || ""}`}>
                    {editingRow === row.original.id && cell.column.id !== "actions" ? (
                      <Input 
                          value={editValues[cell.column.id as keyof Member] || ""}
                          onChange={e => setEditValues({...editValues, [cell.column.id]: e.target.value})}
                      />
                    ) : flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
