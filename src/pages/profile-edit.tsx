import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { MonthPicker } from '@/app/components/ui/month-picker';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/app/components/ui/form';
import { Badge } from '@/app/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/app/components/ui/command';
import { cn } from '@/app/components/ui/utils';
import {
  getCountries,
  getSubdivisions,
  getCities,
  type GeoCountry,
  type GeoSubdivision,
  type GeoCity,
} from '@/services/geo-data';

// --- Types ---
interface WorkExperience {
  id: number;
  company_name: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string;
}

interface Education {
  id: number;
  institution_name: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string | null;
}

interface ProfileData {
  bio: string;
  birth_date: string | null;
  company: string;
  location_country_id: string;
  location_subdivision_id: string;
  location_city_name?: string;
}

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Derive locale for geo data
  const locale = i18n.language.startsWith('zh') ? 'zh' : 'en';

  const profileSchema = z.object({
    bio: z.string().max(500, t('profileEdit.bioMax')),
    birth_date: z.string(),
    company: z.string().max(100, t('profileEdit.companyMax')),
    location_country_id: z.string(),
    location_subdivision_id: z.string(),
    location_city_name: z.string(),
  });

  type ProfileFormValues = z.infer<typeof profileSchema>;

  const workExpSchema = z.object({
    company_name: z.string().min(1, t('profileEdit.enterCompanyName')),
    title: z.string().min(1, t('profileEdit.enterJobTitle')),
    start_date: z.string().min(1, t('profileEdit.selectStartDate')),
    end_date: z.string(),
    description: z.string().max(500, t('profileEdit.descriptionMax')),
  });

  type WorkExpFormValues = z.infer<typeof workExpSchema>;

  const educationSchema = z.object({
    institution_name: z.string().min(1, t('profileEdit.enterSchoolName')),
    degree: z.string().min(1, t('profileEdit.enterDegree')),
    field_of_study: z.string().min(1, t('profileEdit.enterMajor')),
    start_date: z.string().min(1, t('profileEdit.selectStartDate')),
    end_date: z.string(),
  });

  type EducationFormValues = z.infer<typeof educationSchema>;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);

  // Geo selector states
  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [subdivisions, setSubdivisions] = useState<GeoSubdivision[]>([]);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [subdivisionsLoading, setSubdivisionsLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [subdivisionOpen, setSubdivisionOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  // Dialog states
  const [workDialogOpen, setWorkDialogOpen] = useState(false);
  const [eduDialogOpen, setEduDialogOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkExperience | null>(null);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const [dialogSaving, setDialogSaving] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMonth = todayStr.slice(0, 7);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: '',
      birth_date: '',
      company: '',
      location_country_id: '',
      location_subdivision_id: '',
      location_city_name: '',
    },
  });

  const workForm = useForm<WorkExpFormValues>({
    resolver: zodResolver(workExpSchema),
    defaultValues: {
      company_name: '',
      title: '',
      start_date: '',
      end_date: '',
      description: '',
    },
  });

  const eduForm = useForm<EducationFormValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      institution_name: '',
      degree: '',
      field_of_study: '',
      start_date: '',
      end_date: '',
    },
  });

  // Load subdivisions when country changes
  const loadSubdivisions = useCallback(async (countryId: string) => {
    if (!countryId) {
      setSubdivisions([]);
      return;
    }
    setSubdivisionsLoading(true);
    try {
      const subs = await getSubdivisions(countryId, locale);
      setSubdivisions(subs);
    } catch {
      setSubdivisions([]);
    } finally {
      setSubdivisionsLoading(false);
    }
  }, [locale]);

  // Load cities when subdivision changes
  const loadCities = useCallback(async (countryId: string, subdivisionId: string) => {
    if (!countryId || !subdivisionId) {
      setCities([]);
      return;
    }
    setCitiesLoading(true);
    try {
      const cityList = await getCities(countryId, subdivisionId, locale);
      setCities(cityList);
    } catch {
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    async function loadData() {
      try {
        // Load profile data from backend APIs
        const [profileRes, workExpRes, eduRes] = await Promise.all([
          api.get('/me/profile'),
          api.get('/me/work-experiences'),
          api.get('/me/educations'),
        ]);

        const profile: ProfileData = profileRes.data.profile;
        form.reset({
          bio: profile.bio || '',
          birth_date: profile.birth_date ? profile.birth_date.slice(0, 7) : '',
          company: profile.company || '',
          location_country_id: profile.location_country_id || '',
          location_subdivision_id: profile.location_subdivision_id || '',
          location_city_name: profile.location_city_name || '',
        });

        setWorkExperiences(workExpRes.data.items || []);
        setEducations(eduRes.data.items || []);

        // Load geo data separately so failures don't block profile rendering
        setCountriesLoading(true);
        try {
          const countriesList = await getCountries(locale);
          setCountries(countriesList);

          // Load subdivisions if user already has a country selected
          if (profile.location_country_id) {
            const subs = await getSubdivisions(profile.location_country_id, locale);
            setSubdivisions(subs);

            // Load cities if user already has a subdivision selected
            if (profile.location_subdivision_id) {
              const cityList = await getCities(profile.location_country_id, profile.location_subdivision_id, locale);
              setCities(cityList);
            }
          }
        } catch {
          // Geo data is non-critical; page remains usable without it
        } finally {
          setCountriesLoading(false);
        }
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message || t('profileEdit.loadFailed'));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSaveProfile(values: ProfileFormValues) {
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {
        bio: values.bio,
        birth_date: values.birth_date ? values.birth_date + '-01' : null,
        company: values.company,
        location_country_id: values.location_country_id || '',
        location_subdivision_id: values.location_subdivision_id || '',
        location_city_name: values.location_city_name || '',
      };
      await api.patch('/me/profile', payload);
      toast.success(t('profileEdit.profileUpdated'));
      navigate('/profile');
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('profileEdit.updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  // --- Work Experience CRUD ---
  function openAddWork() {
    setEditingWork(null);
    workForm.reset({ company_name: '', title: '', start_date: '', end_date: '', description: '' });
    setWorkDialogOpen(true);
  }

  function openEditWork(exp: WorkExperience) {
    setEditingWork(exp);
    workForm.reset({
      company_name: exp.company_name,
      title: exp.title,
      start_date: exp.start_date ? exp.start_date.slice(0, 7) : '',
      end_date: exp.end_date ? exp.end_date.slice(0, 7) : '',
      description: exp.description || '',
    });
    setWorkDialogOpen(true);
  }

  async function onSaveWork(values: WorkExpFormValues) {
    setDialogSaving(true);
    try {
      const payload = {
        ...values,
        start_date: values.start_date ? values.start_date + '-01' : '',
        end_date: values.end_date ? values.end_date + '-01' : null,
      };
      if (editingWork) {
        const { data } = await api.patch(`/me/work-experiences/${editingWork.id}`, payload);
        setWorkExperiences(prev => prev.map(w => w.id === editingWork.id ? data : w));
        toast.success(t('profileEdit.workExpUpdated'));
      } else {
        const { data } = await api.post('/me/work-experiences', payload);
        setWorkExperiences(prev => [...prev, data]);
        toast.success(t('profileEdit.workExpAdded'));
      }
      setWorkDialogOpen(false);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('addresses.operationFailed'));
    } finally {
      setDialogSaving(false);
    }
  }

  async function deleteWork(id: number) {
    try {
      await api.delete(`/me/work-experiences/${id}`);
      setWorkExperiences(prev => prev.filter(w => w.id !== id));
      toast.success(t('profileEdit.workExpDeleted'));
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message || '删除失败');
    }
  }

  // --- Education CRUD ---
  function openAddEdu() {
    setEditingEdu(null);
    eduForm.reset({ institution_name: '', degree: '', field_of_study: '', start_date: '', end_date: '' });
    setEduDialogOpen(true);
  }

  function openEditEdu(edu: Education) {
    setEditingEdu(edu);
    eduForm.reset({
      institution_name: edu.institution_name,
      degree: edu.degree,
      field_of_study: edu.field_of_study,
      start_date: edu.start_date ? edu.start_date.slice(0, 7) : '',
      end_date: edu.end_date ? edu.end_date.slice(0, 7) : '',
    });
    setEduDialogOpen(true);
  }

  async function onSaveEdu(values: EducationFormValues) {
    setDialogSaving(true);
    try {
      const payload = {
        ...values,
        start_date: values.start_date ? values.start_date + '-01' : '',
        end_date: values.end_date ? values.end_date + '-01' : null,
      };
      if (editingEdu) {
        const { data } = await api.patch(`/me/educations/${editingEdu.id}`, payload);
        setEducations(prev => prev.map(e => e.id === editingEdu.id ? data : e));
        toast.success(t('profileEdit.eduExpUpdated'));
      } else {
        const { data } = await api.post('/me/educations', payload);
        setEducations(prev => [...prev, data]);
        toast.success(t('profileEdit.eduExpAdded'));
      }
      setEduDialogOpen(false);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('addresses.operationFailed'));
    } finally {
      setDialogSaving(false);
    }
  }

  async function deleteEdu(id: number) {
    try {
      await api.delete(`/me/educations/${id}`);
      setEducations(prev => prev.filter(e => e.id !== id));
      toast.success(t('profileEdit.eduExpDeleted'));
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message || '删除失败');
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label={t('common.back')} onClick={() => navigate('/profile')}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">{t('profileEdit.title')}</h1>
      </div>

      <Form {...form}>
        <form id="profile-form" onSubmit={form.handleSubmit(onSaveProfile)} className="space-y-6">
          {/* 基本资料区 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t('profileEdit.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profileEdit.bio')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('profileEdit.bioPlaceholder')} className="resize-none" rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profileEdit.birthday')}</FormLabel>
                    <FormControl>
                      <MonthPicker max={todayMonth} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profileEdit.company')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('profileEdit.companyPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Location: Country + Subdivision selectors */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location_country_id"
                  render={({ field }) => {
                    const selectedCountry = countries.find(c => c.id === field.value);
                    const displayName = selectedCountry
                      ? (locale === 'zh' ? selectedCountry.name_zh : selectedCountry.name)
                      : '';
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('profileEdit.country')}</FormLabel>
                        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={countryOpen}
                                className={cn(
                                  'w-full justify-between font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {countriesLoading
                                  ? t('profileEdit.loadingGeo')
                                  : displayName || t('profileEdit.countryPlaceholder')}
                                <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder={t('profileEdit.countrySearch')} />
                              <CommandList>
                                <CommandEmpty>{t('profileEdit.countryEmpty')}</CommandEmpty>
                                <CommandGroup>
                                  {countries.map((country) => {
                                    const label = locale === 'zh' ? country.name_zh : country.name;
                                    return (
                                      <CommandItem
                                        key={country.id}
                                        value={label}
                                        onSelect={() => {
                                          const newValue = country.id === field.value ? '' : country.id;
                                          field.onChange(newValue);
                                          // Clear subdivision and city when country changes
                                          form.setValue('location_subdivision_id', '');
                                          form.setValue('location_city_name', '');
                                          setSubdivisions([]);
                                          setCities([]);
                                          if (newValue) {
                                            loadSubdivisions(newValue);
                                          }
                                          setCountryOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            'size-4',
                                            field.value === country.id ? 'opacity-100' : 'opacity-0'
                                          )}
                                        />
                                        {label}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Subdivision selector: only shown when country has subdivisions */}
                {(subdivisions.length > 0 || subdivisionsLoading) && (
                  <FormField
                    control={form.control}
                    name="location_subdivision_id"
                    render={({ field }) => {
                      const selectedSub = subdivisions.find(s => s.id === field.value);
                      const displayName = selectedSub
                        ? (locale === 'zh' ? selectedSub.name_zh : selectedSub.name)
                        : '';
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t('profileEdit.subdivision')}</FormLabel>
                          <Popover open={subdivisionOpen} onOpenChange={setSubdivisionOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={subdivisionOpen}
                                  className={cn(
                                    'w-full justify-between font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {subdivisionsLoading
                                    ? t('profileEdit.loadingGeo')
                                    : displayName || t('profileEdit.subdivisionPlaceholder')}
                                  <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                              <Command>
                                <CommandInput placeholder={t('profileEdit.subdivisionSearch')} />
                                <CommandList>
                                  <CommandEmpty>{t('profileEdit.subdivisionEmpty')}</CommandEmpty>
                                  <CommandGroup>
                                    {subdivisions.map((sub) => {
                                      const label = locale === 'zh' ? sub.name_zh : sub.name;
                                      return (
                                        <CommandItem
                                          key={sub.id}
                                          value={label}
                                          onSelect={() => {
                                            const newValue = sub.id === field.value ? '' : sub.id;
                                            field.onChange(newValue);
                                            // Clear city and reload when subdivision changes
                                            form.setValue('location_city_name', '');
                                            setCities([]);
                                            if (newValue) {
                                              loadCities(form.getValues('location_country_id'), newValue);
                                            }
                                            setSubdivisionOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'size-4',
                                              field.value === sub.id ? 'opacity-100' : 'opacity-0'
                                            )}
                                          />
                                          {label}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                {/* City selector: only shown when selected subdivision has cities */}
                {(cities.length > 0 || citiesLoading) && (
                  <FormField
                    control={form.control}
                    name="location_city_name"
                    render={({ field }) => {
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t('profileEdit.city')}</FormLabel>
                          <Popover open={cityOpen} onOpenChange={setCityOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={cityOpen}
                                  className={cn(
                                    'w-full justify-between font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {citiesLoading
                                    ? t('profileEdit.loadingGeo')
                                    : field.value || t('profileEdit.cityPlaceholder')}
                                  <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                              <Command>
                                <CommandInput placeholder={t('profileEdit.citySearch')} />
                                <CommandList>
                                  <CommandEmpty>{t('profileEdit.cityEmpty')}</CommandEmpty>
                                  <CommandGroup>
                                    {cities.map((city) => {
                                      const label = city.name_zh;
                                      return (
                                        <CommandItem
                                          key={label}
                                          value={label}
                                          onSelect={() => {
                                            const newValue = label === field.value ? '' : label;
                                            field.onChange(newValue);
                                            setCityOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'size-4',
                                              field.value === label ? 'opacity-100' : 'opacity-0'
                                            )}
                                          />
                                          {label}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>

        </form>
      </Form>

      {/* 工作经历区 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">{t('profileEdit.workExperience')}</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={openAddWork}>
            <Plus className="size-4" />
            {t('profileEdit.addWorkExp')}
          </Button>
        </CardHeader>
        <CardContent>
          {workExperiences.length > 0 ? (
            <div className="space-y-4">
              {workExperiences.map((exp) => (
                <div key={exp.id} className="flex items-start justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{exp.company_name}</span>
                      <Badge variant="secondary">{exp.title}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {exp.start_date} - {exp.end_date || t('common.present')}
                    </p>
                    {exp.description && (
                      <p className="text-sm text-muted-foreground">{exp.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" aria-label={t('common.edit')} onClick={() => openEditWork(exp)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" aria-label={t('common.delete')} onClick={() => deleteWork(exp.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{t('profileEdit.noWorkExp')}</p>
          )}
        </CardContent>
      </Card>

      {/* 教育背景区 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">{t('profileEdit.education')}</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={openAddEdu}>
            <Plus className="size-4" />
            {t('profileEdit.addEduExp')}
          </Button>
        </CardHeader>
        <CardContent>
          {educations.length > 0 ? (
            <div className="space-y-4">
              {educations.map((edu) => (
                <div key={edu.id} className="flex items-start justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{edu.institution_name}</span>
                      <Badge variant="secondary">{edu.degree}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{edu.field_of_study}</p>
                    <p className="text-sm text-muted-foreground">
                      {edu.start_date} - {edu.end_date || t('common.present')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" aria-label={t('common.edit')} onClick={() => openEditEdu(edu)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" aria-label={t('common.delete')} onClick={() => deleteEdu(edu.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{t('profileEdit.noEduExp')}</p>
          )}
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end pt-2 pb-4">
        <Button type="submit" form="profile-form" disabled={saving} size="lg">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {t('profileEdit.saveAll')}
        </Button>
      </div>

      {/* 工作经历 Dialog */}
      <Dialog open={workDialogOpen} onOpenChange={setWorkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWork ? t('profileEdit.editWorkExp') : t('profileEdit.addWorkExp')}</DialogTitle>
          </DialogHeader>
          <Form {...workForm}>
            <form onSubmit={workForm.handleSubmit(onSaveWork)} className="space-y-4">
              <FormField
                control={workForm.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profileEdit.companyName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('profileEdit.companyNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={workForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profileEdit.jobTitle')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('profileEdit.jobTitlePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={workForm.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profileEdit.startDate')}</FormLabel>
                      <FormControl>
                        <MonthPicker {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={workForm.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profileEdit.endDateOptional')}</FormLabel>
                      <FormControl>
                        <MonthPicker {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={workForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profileEdit.description')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('profileEdit.descriptionPlaceholder')} className="resize-none" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setWorkDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={dialogSaving}>
                  {dialogSaving && <Loader2 className="size-4 animate-spin" />}
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 教育经历 Dialog */}
      <Dialog open={eduDialogOpen} onOpenChange={setEduDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEdu ? t('profileEdit.editEduExp') : t('profileEdit.addEduExp')}</DialogTitle>
          </DialogHeader>
          <Form {...eduForm}>
            <form onSubmit={eduForm.handleSubmit(onSaveEdu)} className="space-y-4">
              <FormField
                control={eduForm.control}
                name="institution_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profileEdit.schoolName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('profileEdit.schoolNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={eduForm.control}
                  name="degree"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profileEdit.degree')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('profileEdit.degreePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={eduForm.control}
                  name="field_of_study"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profileEdit.major')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('profileEdit.majorPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={eduForm.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profileEdit.startDate')}</FormLabel>
                      <FormControl>
                        <MonthPicker {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={eduForm.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profileEdit.endDateOptional')}</FormLabel>
                      <FormControl>
                        <MonthPicker {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEduDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={dialogSaving}>
                  {dialogSaving && <Loader2 className="size-4 animate-spin" />}
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
