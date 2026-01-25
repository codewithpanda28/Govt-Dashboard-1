'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Calendar,
  Edit,
  AlertCircle,
  CreditCard
} from "lucide-react";

interface AccusedDetails {
  id: number;
  full_name: string;
  alias_name: string | null;
  age: number;
  gender: string;
  date_of_birth: string | null;
  mobile_number: string | null;
  email: string | null;
  father_name: string | null;
  mother_name: string | null;
  current_address: string;
  permanent_address: string | null;
  pincode: string | null;
  aadhar_number: string | null;
  pan_number: string | null;
  photo_url: string | null;
  identification_marks: string | null;
  previous_cases: number;
  previous_convictions: number;
  is_habitual_offender: boolean;
  fir_id: number;
  created_at: string;
}

interface FIRDetails {
  fir_number: string;
  incident_date: string;
  incident_time: string;
  brief_description: string;
  case_status: string;
}

export default function AccusedDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [accused, setAccused] = useState<AccusedDetails | null>(null);
  const [fir, setFir] = useState<FIRDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadAccusedDetails();
    }
  }, [params.id]);

  const loadAccusedDetails = async () => {
    try {
      setLoading(true);

      const { data: accusedData, error: accusedError } = await supabase
        .from("accused_persons")
        .select("*")
        .eq("id", params.id)
        .single();

      if (accusedError) throw accusedError;
      setAccused(accusedData);

      if (accusedData?.fir_id) {
        const { data: firData } = await supabase
          .from("fir_records")
          .select("fir_number, incident_date, incident_time, brief_description, case_status")
          .eq("id", accusedData.fir_id)
          .single();

        setFir(firData);
      }
    } catch (error) {
      console.error("Error loading accused details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!accused) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-900">Accused not found</p>
            <Button className="mt-4" variant="outline" onClick={() => router.push('/accused/list')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Accused Details</h1>
          <Button onClick={() => router.push(`/accused/${accused.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>
      
      <div className="p-4 lg:p-6">
        {/* Back Button - YEH LINE CHANGE KARI */}
        <div className="mb-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/accused/list')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Photo & Quick Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Photo Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  {accused.photo_url ? (
                    <img 
                      src={accused.photo_url} 
                      alt={accused.full_name}
                      className="w-48 h-48 rounded-lg object-cover mx-auto border-4 border-gray-100 shadow-lg"
                    />
                  ) : (
                    <div className="w-48 h-48 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg">
                      <span className="text-6xl font-bold text-white">
                        {accused.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  
                  <h2 className="mt-4 text-2xl font-bold text-gray-900">
                    {accused.full_name}
                  </h2>
                  
                  {accused.alias_name && (
                    <p className="text-sm text-gray-500 mt-1">
                      a.k.a. <span className="font-medium">{accused.alias_name}</span>
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Badge variant="outline">{accused.gender}</Badge>
                    <Badge variant="secondary">{accused.age} years</Badge>
                    {accused.is_habitual_offender && (
                      <Badge variant="destructive">⚠️ Habitual Offender</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-gray-500">Age / Gender</span>
                    <p className="font-medium text-gray-900">
                      {accused.age} years / {accused.gender}
                    </p>
                  </div>
                </div>

                {accused.mobile_number && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-gray-500">Mobile</span>
                      <p className="font-medium text-gray-900">{accused.mobile_number}</p>
                    </div>
                  </div>
                )}

                {accused.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-gray-500">Email</span>
                      <p className="font-medium text-gray-900">{accused.email}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-gray-500">Registered On</span>
                    <p className="font-medium text-gray-900">{formatDate(accused.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Detailed Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* FIR Details */}
            {fir && (
              <Card>
                <CardHeader className="bg-blue-50 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    FIR Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm text-gray-500">FIR Number</label>
                      <p className="font-semibold text-blue-600">{fir.fir_number}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Incident Date</label>
                      <p className="font-medium text-gray-900">
                        {formatDate(fir.incident_date)} {fir.incident_time && `at ${fir.incident_time}`}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Case Status</label>
                      <Badge variant="outline" className="mt-1">{fir.case_status}</Badge>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm text-gray-500">Description</label>
                      <p className="font-medium text-gray-900">{fir.brief_description || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Personal Details */}
            <Card>
              <CardHeader className="bg-green-50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-gray-500">Full Name</label>
                    <p className="font-medium text-gray-900">{accused.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Date of Birth</label>
                    <p className="font-medium text-gray-900">{formatDate(accused.date_of_birth)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Father's Name</label>
                    <p className="font-medium text-gray-900">{accused.father_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Mother's Name</label>
                    <p className="font-medium text-gray-900">{accused.mother_name || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Details */}
            <Card>
              <CardHeader className="bg-purple-50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  Address Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Current Address</label>
                    <p className="font-medium text-gray-900">{accused.current_address || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Permanent Address</label>
                    <p className="font-medium text-gray-900">{accused.permanent_address || 'Same as current'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Pincode</label>
                    <p className="font-medium text-gray-900">{accused.pincode || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identification */}
            <Card>
              <CardHeader className="bg-amber-50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                  Identification
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-gray-500">Aadhar Number</label>
                    <p className="font-medium text-gray-900 font-mono">{accused.aadhar_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">PAN Number</label>
                    <p className="font-medium text-gray-900 font-mono">{accused.pan_number || 'N/A'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm text-gray-500">Identification Marks</label>
                    <p className="font-medium text-gray-900">{accused.identification_marks || 'None specified'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Criminal History */}
            <Card>
              <CardHeader className="bg-red-50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Criminal History
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-gray-900">{accused.previous_cases || 0}</p>
                    <p className="text-sm text-gray-500 mt-1">Previous Cases</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-gray-900">{accused.previous_convictions || 0}</p>
                    <p className="text-sm text-gray-500 mt-1">Convictions</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className={`text-3xl font-bold ${accused.is_habitual_offender ? 'text-red-600' : 'text-green-600'}`}>
                      {accused.is_habitual_offender ? "Yes" : "No"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Habitual Offender</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}