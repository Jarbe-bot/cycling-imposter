import React, { useState, useEffect } from 'react';
import { Cyclist } from '../types';
import { supabase } from '../supabaseClient';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../cropUtils';

interface AdminDatabaseProps {
  cyclists: Cyclist[];
  setCyclists: React.Dispatch<React.SetStateAction<Cyclist[]>>; // Dit is de sleutel tot de update!
  onNavigateToDashboard: () => void;
  onLogout: () => void;
}

const AdminDatabase: React.FC<AdminDatabaseProps> = ({ cyclists, setCyclists, onNavigateToDashboard, onLogout }) => {
  // ... (States blijven hetzelfde)
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newCyclist, setNewCyclist] = useState<Partial<Cyclist>>({
    name: '', team: '', country: '', status: 'active', imageUrl: ''
  });

  // Image Upload & Crop States
  const [inputType, setInputType] = useState<'upload' | 'url'>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setSelectedImage(reader.result as string));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage || !croppedAreaPixels) return null;

    try {
      const croppedImageBlob = await getCroppedImg(selectedImage, croppedAreaPixels);
      const fileName = `${Date.now()}-${newCyclist.name?.replace(/\s/g, '')}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('cyclist-photos')
        .upload(fileName, croppedImageBlob);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('cyclist-photos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload mislukt!');
      return null;
    }
  };

  const handleSaveCyclist = async () => {
    if (!newCyclist.name || !newCyclist.team) return alert("Vul naam en team in!");
    setIsLoading(true);

    let finalImageUrl = newCyclist.imageUrl;

    if (inputType === 'upload' && selectedImage) {
        const uploadedUrl = await uploadImage();
        if (!uploadedUrl) {
            setIsLoading(false);
            return;
        }
        finalImageUrl = uploadedUrl;
    }

    const cyclistData = {
      name: newCyclist.name,
      team: newCyclist.team,
      country: newCyclist.country || 'Unknown',
      status: newCyclist.status,
      image_url: finalImageUrl,
      last_updated: new Date().toISOString().split('T')[0]
    };

    let savedData = null;

    if (editingId) {
        // UPDATE
        const { data, error } = await supabase
            .from('cyclists')
            .update(cyclistData)
            .eq('id', editingId)
            .select()
            .single();
        
        if (error) { alert("Error updating: " + error.message); }
        else { savedData = data; }

    } else {
        // INSERT
        const { data, error } = await supabase
            .from('cyclists')
            .insert([cyclistData])
            .select()
            .single();

        if (error) { alert("Error inserting: " + error.message); }
        else { savedData = data; }
    }

    if (savedData) {
        // HIERRMEE UPDATEN WE DE APP DIRECT ZONDER REFRESH
        const formattedCyclist: Cyclist = {
            ...savedData,
            imageUrl: savedData.image_url // Map database veld naar app veld
        };

        if (editingId) {
            setCyclists(prev => prev.map(c => c.id === editingId ? formattedCyclist : c));
        } else {
            setCyclists(prev => [...prev, formattedCyclist]);
        }

        setShowAddModal(false);
        resetForm();
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Zeker weten?")) return;
    const { error } = await supabase.from('cyclists').delete().eq('id', id);
    if (!error) {
        // Update ook lokaal!
        setCyclists(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleEditClick = (cyclist: any) => {
    setEditingId(cyclist.id);
    setNewCyclist({
        name: cyclist.name,
        team: cyclist.team,
        country: cyclist.country,
        status: cyclist.status,
        imageUrl: cyclist.image_url || cyclist.imageUrl
    });
    setInputType('url'); 
    setShowAddModal(true);
  };

  const handleAddNewClick = () => {
      resetForm();
      setShowAddModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setNewCyclist({ name: '', team: '', country: '', status: 'active', imageUrl: '' });
    setSelectedImage(null);
    setInputType('upload');
  };

  const filteredCyclists = cyclists.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.team.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background-dark">
      <aside className="w-64 bg-[#0d1c12] border-r border-[#22492f] hidden md:flex flex-col flex-shrink-0">
        <div className="p-6 text-white font-bold text-xl">Admin Panel</div>
        <nav className="flex-1 px-4 py-2 flex flex-col gap-2">
            <button onClick={onNavigateToDashboard} className="text-text-muted hover:text-white px-4 py-3 text-left">Terug naar Quiz</button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex justify-between items-end">
                <h2 className="text-white text-3xl font-black">Cyclist Database</h2>
                <button onClick={handleAddNewClick} className="bg-primary text-[#102316] px-6 py-3 rounded-full font-bold shadow-neon flex items-center gap-2">
                    <span className="material-symbols-outlined">add</span> Add Cyclist
                </button>
            </div>

            <input 
                className="w-full bg-[#102216] text-white p-4 rounded-xl border-none focus:ring-2 focus:ring-primary"
                placeholder="Zoek renner..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} 
            />

            <div className="flex flex-col gap-3">
              {filteredCyclists.map(cyclist => (
                <div key={cyclist.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-surface-dark p-4 rounded-2xl border border-transparent hover:border-[#22492f]">
                  <div className="col-span-5 flex items-center gap-4">
                    <img className="w-12 h-12 rounded-full object-cover" src={cyclist.imageUrl} alt={cyclist.name} onError={(e) => (e.currentTarget.src = 'https://placehold.co/200x200?text=No+Img')} />
                    <h3 className="text-white font-bold">{cyclist.name}</h3>
                  </div>
                  <div className="col-span-3 text-text-muted">{cyclist.team}</div>
                  <div className="col-span-4 flex justify-end gap-2">
                    <button onClick={() => handleEditClick(cyclist)} className="text-blue-400 hover:bg-[#102216] p-2 rounded-full">
                        <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button onClick={() => handleDelete(cyclist.id)} className="text-red-400 hover:bg-[#102216] p-2 rounded-full">
                        <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-dark w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">
                {editingId ? 'Bewerk Renner' : 'Nieuwe Renner'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <input className="bg-input-dark p-3 rounded-xl text-white" placeholder="Naam" value={newCyclist.name} onChange={e => setNewCyclist({...newCyclist, name: e.target.value})} />
                <input className="bg-input-dark p-3 rounded-xl text-white" placeholder="Team" value={newCyclist.team} onChange={e => setNewCyclist({...newCyclist, team: e.target.value})} />
                <input className="bg-input-dark p-3 rounded-xl text-white" placeholder="Land" value={newCyclist.country} onChange={e => setNewCyclist({...newCyclist, country: e.target.value})} />
                <select className="bg-input-dark p-3 rounded-xl text-white" value={newCyclist.status} onChange={e => setNewCyclist({...newCyclist, status: e.target.value as any})}>
                    <option value="active">Active</option>
                    <option value="retired">Retired</option>
                </select>
            </div>

            <div className="mb-6">
                <div className="flex gap-4 mb-4 border-b border-border-dark pb-2">
                    <button onClick={() => setInputType('upload')} className={`pb-2 text-sm font-bold ${inputType === 'upload' ? 'text-primary border-b-2 border-primary' : 'text-text-muted'}`}>Upload</button>
                    <button onClick={() => setInputType('url')} className={`pb-2 text-sm font-bold ${inputType === 'url' ? 'text-primary border-b-2 border-primary' : 'text-text-muted'}`}>URL</button>
                </div>

                {inputType === 'upload' ? (
                    <div>
                        {!selectedImage ? (
                            <input type="file" onChange={onFileChange} className="text-text-muted file:bg-primary file:rounded-full file:border-none file:px-4 file:mr-4 file:cursor-pointer" />
                        ) : (
                            <div className="relative h-64 w-full bg-black rounded-xl overflow-hidden border border-border-dark">
                                <Cropper image={selectedImage} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)} onZoomChange={setZoom} />
                            </div>
                        )}
                        {selectedImage && (
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-white text-xs">Zoom:</span>
                                <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
                                <button onClick={() => setSelectedImage(null)} className="text-red-400 text-xs font-bold">Wis</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <input className="bg-input-dark p-3 rounded-xl text-white w-full" placeholder="https://..." value={newCyclist.imageUrl} onChange={e => setNewCyclist({...newCyclist, imageUrl: e.target.value})} />
                )}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-white">Annuleren</button>
              <button onClick={handleSaveCyclist} disabled={isLoading} className="flex-1 py-3 bg-primary rounded-xl font-bold text-background-dark">
                {isLoading ? 'Opslaan...' : (editingId ? 'Wijziging Opslaan' : 'Toevoegen')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDatabase;