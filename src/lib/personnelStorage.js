import { supabase } from "./supabaseClient";

export async function uploadPersonnelFile(bucket, personnelId, file) {
  const ext = file.name.split(".").pop();
  const path = `${personnelId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return {
    path,
    url: data.publicUrl,
  };
}

export async function deletePersonnelFile(bucket, path) {
  if (!path) return;

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
}
