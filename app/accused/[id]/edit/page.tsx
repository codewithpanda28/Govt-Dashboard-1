'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2, User, Phone, CreditCard, MapPin, FileText } from 'lucide-react';

export default function EditAccusedPage() {
  const params = useParams();
  const router = useRouter();
  const [accused, setAccused] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (params.id) {
      loadAccused();
    }
  }, [params.id]);

  const loadAccused = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('accused_persons')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setAccused(data);

    } catch (error: any) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Failed to load accused' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    
    const updateData = {
      full_name: formData.get('full_name') as string,
      alias_name: formData.get('alias_name') as string || null,
      age: parseInt(formData.get('age') as string) || null,
      gender: formData.get('gender') as string,
      date_of_birth: formData.get('date_of_birth') as string || null,
      father_name: formData.get('father_name') as string || null,
      mother_name: formData.get('mother_name') as string || null,
      mobile_number: formData.get('mobile_number') as string || null,
      email: formData.get('email') as string || null,
      aadhar_number: formData.get('aadhar_number') as string || null,
      pan_number: formData.get('pan_number') as string || null,
      current_address: formData.get('current_address') as string || null,
      permanent_address: formData.get('permanent_address') as string || null,
      pincode: formData.get('pincode') as string || null,
      identification_marks: formData.get('identification_marks') as string || null,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('accused_persons')
        .update(updateData)
        .eq('id', params.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Accused updated successfully!' });
      
      setTimeout(() => {
        router.push(`/accused/${params.id}`);
      }, 1000);
      
    } catch (error: any) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update accused' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!accused) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-xl text-gray-500 mb-4">Accused not found</p>
        <Button onClick={() => router.push('/accused/list')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/accused/${params.id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Edit Accused</h1>
            <p className="text-sm text-gray-500">{accused.full_name}</p>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
          
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-blue-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    defaultValue={accused.full_name || ''}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="alias_name">Alias Name</Label>
                  <Input
                    id="alias_name"
                    name="alias_name"
                    defaultValue={accused.alias_name || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <select
                    id="gender"
                    name="gender"
                    defaultValue={accused.gender || 'Male'}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    min="1"
                    max="120"
                    defaultValue={accused.age || ''}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    defaultValue={accused.date_of_birth || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="father_name">Father's Name</Label>
                  <Input
                    id="father_name"
                    name="father_name"
                    defaultValue={accused.father_name || ''}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="mother_name">Mother's Name</Label>
                <Input
                  id="mother_name"
                  name="mother_name"
                  defaultValue={accused.mother_name || ''}
                  className="max-w-md"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="h-5 w-5 text-green-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mobile_number">Mobile Number</Label>
                  <Input
                    id="mobile_number"
                    name="mobile_number"
                    defaultValue={accused.mobile_number || ''}
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={accused.email || ''}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ID Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-purple-600" />
                ID Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aadhar_number">Aadhar Number</Label>
                  <Input
                    id="aadhar_number"
                    name="aadhar_number"
                    defaultValue={accused.aadhar_number || ''}
                    maxLength={12}
                  />
                </div>
                <div>
                  <Label htmlFor="pan_number">PAN Number</Label>
                  <Input
                    id="pan_number"
                    name="pan_number"
                    defaultValue={accused.pan_number || ''}
                    maxLength={10}
                    className="uppercase"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-red-600" />
                Address Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current_address">Current Address</Label>
                <Textarea
                  id="current_address"
                  name="current_address"
                  defaultValue={accused.current_address || ''}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="permanent_address">Permanent Address</Label>
                <Textarea
                  id="permanent_address"
                  name="permanent_address"
                  defaultValue={accused.permanent_address || ''}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  name="pincode"
                  defaultValue={accused.pincode || ''}
                  maxLength={6}
                  className="max-w-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Other Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-orange-600" />
                Other Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="identification_marks">Identification Marks</Label>
                <Textarea
                  id="identification_marks"
                  name="identification_marks"
                  defaultValue={accused.identification_marks || ''}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4 sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border">
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push(`/accused/${params.id}`)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}