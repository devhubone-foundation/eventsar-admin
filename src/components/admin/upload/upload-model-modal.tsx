"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { useMetaEnums } from "@/lib/meta/use-meta";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

async function uploadModel(formData: FormData) {
  // direct call to proxy route
  const res = await fetch("/api/admin/upload/model", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  const NONE = "__NONE__";

  if (!res.ok) {
    throw new Error(data?.message ?? `Upload failed (${res.status})`);
  }
  return data;
}

export function UploadModelModal({
                                   open,
                                   onOpenChange,
                                   defaultEventSlug,
                                   onUploaded,
                                 }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultEventSlug: string;
  onUploaded: (modelId: number) => void;
}) {
  const meta = useMetaEnums();
  const types = meta.enums.Model_Type ?? [];

  const [eventSlug, setEventSlug] = useState(defaultEventSlug);
  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      if (!eventSlug.trim()) throw new Error("eventSlug is required");
      if (!type) throw new Error("type is required");
      if (!file) throw new Error("file is required");

      const fd = new FormData();
      fd.set("eventSlug", eventSlug.trim());
      fd.set("type", type);
      fd.set("name", name.trim() || "Model");
      fd.set("file", file);
      return uploadModel(fd);
    },
    onSuccess: (data) => {
      const modelId = data?.model_id;
      if (!modelId) {
        toast.error("Upload succeeded but model_id missing");
        return;
      }
      toast.success("Uploaded");
      onUploaded(Number(modelId));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload model</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Event slug</Label>
            <Input value={eventSlug} onChange={(e) => setEventSlug(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {types.map((x) => (
                  <SelectItem key={x} value={x}>{x}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Robot Detective v1" />
          </div>

          <div
            className="rounded border p-4 text-sm text-muted-foreground"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">Drag & drop .glb here</div>
                <div className="text-xs">or click to choose a file</div>
              </div>
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                Choose file
              </Button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".glb,model/gltf-binary"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {file && <div className="mt-3 text-xs">Selected: {file.name}</div>}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
