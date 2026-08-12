import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadPersonnelFile } from '../lib/personnelStorage';

export default function AdminPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  async function load() {
    const { data, error } = await supabase
      .from('personnel')
      .select('*')
      .order('display_order');

    if (!error) setRows(data || []);
  }

  useEffect(() => { load(); }, []);

  function edit(row) {
    setForm(row);
    setEditMode(true);
  }

  function add() {
    setForm({
      name:'',
      call_sign:'',
      position:'',
      branch:'',
      section:'',
      group_name:'',
      is_active:true
    });
    setEditMode(true);
  }

  async function save() {
    const payload = {
      name: form.name,
      call_sign: form.call_sign || null,
      position: form.position || null,
      branch: form.branch || null,
      section: form.section || null,
      group_name: form.group_name || null,
      photo_url: form.photo_url || null,
      id_card_url: form.id_card_url || null,
      is_active: form.is_active
    };

    if(form.id)
      await supabase.from('personnel').update(payload).eq('id',form.id);
    else
      await supabase.from('personnel').insert(payload);

    setEditMode(false);
    load();
  }

  async function remove(id){
    if(!confirm('ยืนยันลบ?')) return;
    await supabase.from('personnel').delete().eq('id',id);
    load();
  }

  async function upload(field,file){
    const bucket = field === 'photo'
      ? 'personnel-photo'
      : 'personnel-id-card';

    const result = await uploadPersonnelFile(bucket, form.id, file);
    setForm({...form,[field+'_url']:result.url});
  }

  const filteredRows = useMemo(() => {
    const q = keyword.toLowerCase();
    return rows.filter((row) =>
      (!q || [row.name,row.call_sign,row.position,row.branch,row.section]
        .filter(Boolean).join(' ').toLowerCase().includes(q)) &&
      (filterBranch === 'all' || row.branch === filterBranch) &&
      (filterStatus === 'all' || String(row.is_active) === filterStatus)
    );
  }, [rows, keyword, filterBranch, filterStatus]);

  return (
    <div className="p-4 space-y-4">
      <div className="relative overflow-hidden rounded-[28px] border border-[#e8c56a] bg-gradient-to-br from-[#9b1630] via-[#7f1324] to-[#4d0814] p-5 text-white shadow-[0_20px_40px_rgba(80,10,20,.35),0_8px_0_rgba(70,5,15,.9)]">
        <div className="relative">
        <h1 className="text-xl font-black drop-shadow-[0_3px_3px_rgba(0,0,0,.4)]">
          จัดการบุคลากร ({rows.length})
        </h1>
        <button onClick={add}
          className="bg-red-800 text-white px-4 py-2 rounded mt-3">
          เพิ่มบุคลากร
        </button>
        </div>
      </div>

      <div className="grid gap-2 rounded-2xl bg-white p-4 shadow sm:grid-cols-3">
        <input value={keyword} onChange={e=>setKeyword(e.target.value)}
          placeholder="ค้นหา ชื่อ ตำแหน่ง หน่วย..."
          className="rounded-xl border p-2 text-sm" />
        <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)}
          className="rounded-xl border p-2 text-sm">
          <option value="all">ทุกหน่วย</option>
          {[...new Set(rows.map(r=>r.branch).filter(Boolean))].map(x=><option key={x}>{x}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
          className="rounded-xl border p-2 text-sm">
          <option value="all">ทุกสถานะ</option>
          <option value="true">ใช้งาน</option>
          <option value="false">ปิดใช้งาน</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>ตำแหน่ง</th>
              <th>หน่วย</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
          {filteredRows.map(r=>(
            <tr key={r.id} className="border-t">
              <td>{r.name}</td>
              <td>{r.position}</td>
              <td>{r.branch}</td>
              <td>
                <button onClick={()=>edit(r)}>แก้ไข</button>
                <button onClick={()=>remove(r.id)}>ลบ</button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      {editMode &&
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl space-y-3">
          {['name','call_sign','position','branch','section','group_name'].map(k=>
            <input key={k}
              className="border p-2 block"
              placeholder={k}
              value={form[k]||''}
              onChange={e=>setForm({...form,[k]:e.target.value})}/>
          )}

          <input type="file"
            onChange={e=>upload('photo',e.target.files[0])}/>

          <input type="file"
            onChange={e=>upload('id_card',e.target.files[0])}/>

          <button onClick={save}
            className="bg-green-700 text-white px-4 py-2 rounded">
            บันทึก
          </button>
        </div>
      </div>}
    </div>
  );
}
