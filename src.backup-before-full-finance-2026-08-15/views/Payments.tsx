/**
 * Rumiland Academy — Financial Management
 */
import React, { useEffect, useMemo, useState } from 'react';
import { usePaymentStore } from '@/store';
import { paymentService, studentService, registrationService } from '@/services';
import { Card, EmptyState, Table, Pagination, Badge, Modal } from '@/components/Layout';
import { Button, Input, Select, SearchInput } from '@/components/Basic';
import type { Column } from '@/components/Layout';
import type { Payment } from '@/db/schema';

interface PaymentRow {
  payment: Payment;
  studentName: string;
  className: string;
}

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface RegistrationOption {
  id: string;
  registration_number: string;
  student_id: string;
  class_id?: string;
  course_id?: string;
  tuition_fee: number;
  registration_fee: number;
  discount: number;
  installments?: number;
  total_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  installment_plan_json?: string | null;
  payment_status: string;
}

interface Installment {
  number: number;
  amount: number;
  due_date?: string;
  title?: string;
}

const money = (value: number) =>
  `${Math.max(0, Number(value || 0)).toLocaleString('fa-IR')} تومان`;

const getRegistrationTotal = (r: RegistrationOption) =>
  Number(
    r.total_amount ??
      (Number(r.tuition_fee || 0) +
        Number(r.registration_fee || 0) -
        Number(r.discount || 0))
  );

const getPlan = (r: RegistrationOption): Installment[] => {
  if (!r.installment_plan_json) {
    const total = getRegistrationTotal(r);

    if (r.installments === 2) {
      const first = Math.floor(total / 2);

      return [
        { number: 1, amount: first, title: 'قسط اول' },
        { number: 2, amount: total - first, title: 'قسط دوم' },
      ];
    }

    return [{ number: 1, amount: total, title: 'قسط کامل' }];
  }

  try {
    const parsed = JSON.parse(r.installment_plan_json);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const PaymentsPage: React.FC = () => {
  const { filters, isLoading } = usePaymentStore();

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [studentsList, setStudentsList] = useState<StudentOption[]>([]);
  const [registrationsList, setRegistrationsList] = useState<RegistrationOption[]>([]);

  const [selectedRegistration, setSelectedRegistration] =
    useState<RegistrationOption | null>(null);

  const [registrationPayments, setRegistrationPayments] =
    useState<Payment[]>([]);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);

  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);

  const [formData, setFormData] = useState({
    student_id: '',
    registration_id: '',
    amount: '',
    installment_number: '',
    payment_date_jalali: '',
    method: 'cash',
    description: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    loadPayments();
  }, [filters]);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadPayments = async () => {
    usePaymentStore.getState().setLoading(true);

    try {
      const result = await paymentService.getPaymentsResolved({
        page: filters.page,
        perPage: filters.perPage,
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection,
        search: filters.search,
        status: filters.status || undefined,
        classId: filters.classId || undefined,
      });

      setRows(result.data);
      setTotalCount(result.total);
    } catch (error) {
      console.error('Failed to load payments:', error);
      setRows([]);
      setTotalCount(0);
    } finally {
      usePaymentStore.getState().setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const students = await studentService.getAll();

      setStudentsList(
        students.map((student: any) => ({
          id: student.id,
          first_name: student.first_name || '',
          last_name: student.last_name || '',
        }))
      );
    } catch (error) {
      console.error(error);
      setStudentsList([]);
    }
  };

  const loadRegistrations = async (studentId: string) => {
    if (!studentId) {
      setRegistrationsList([]);
      return;
    }

    try {
      const registrations = await registrationService.getAll();

      setRegistrationsList(
        registrations.filter(
          (registration: RegistrationOption) =>
            registration.student_id === studentId &&
            !registration.deleted_at
        )
      );
    } catch (error) {
      console.error(error);
      setRegistrationsList([]);
    }
  };

  const loadRegistrationPayments = async (registrationId: string) => {
    if (!registrationId) {
      setRegistrationPayments([]);
      return;
    }

    try {
      const all = await paymentService.getPaymentsResolved({
        page: 1,
        perPage: 1000,
        sortBy: 'payment_date',
        sortDirection: 'asc',
      });

      setRegistrationPayments(
        all.data
          .filter(
            (row: PaymentRow) =>
              row.payment.registration_id === registrationId &&
              !row.payment.deleted_at &&
              row.payment.status !== 'cancelled'
          )
          .map((row: PaymentRow) => row.payment)
      );
    } catch (error) {
      console.error(error);
      setRegistrationPayments([]);
    }
  };

  const handleStudentChange = async (studentId: string) => {
    setFormData((current) => ({
      ...current,
      student_id: studentId,
      registration_id: '',
      amount: '',
      installment_number: '',
    }));

    setSelectedRegistration(null);
    setSelectedInstallment(null);
    setRegistrationPayments([]);

    await loadRegistrations(studentId);
  };

  const handleRegistrationChange = async (registrationId: string) => {
    const registration =
      registrationsList.find((item) => item.id === registrationId) || null;

    setSelectedRegistration(registration);
    setSelectedInstallment(null);

    setFormData((current) => ({
      ...current,
      registration_id: registrationId,
      amount: '',
      installment_number: '',
    }));

    await loadRegistrationPayments(registrationId);
  };

  const registrationPaid = useMemo(
    () =>
      registrationPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      ),
    [registrationPayments]
  );

  const registrationTotal = selectedRegistration
    ? getRegistrationTotal(selectedRegistration)
    : 0;

  const registrationRemaining = Math.max(
    0,
    registrationTotal - registrationPaid
  );

  const plan = selectedRegistration
    ? getPlan(selectedRegistration)
    : [];

  const installmentPaid = (number: number) =>
    registrationPayments
      .filter(
        (payment) =>
          Number(payment.installment_number || 0) === number
      )
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const installmentRemaining = (item: Installment) =>
    Math.max(0, Number(item.amount || 0) - installmentPaid(item.number));

  const openInstallmentPayment = (item: Installment) => {
    if (!selectedRegistration) return;

    const remaining = installmentRemaining(item);

    if (remaining <= 0) return;

    setSelectedInstallment(item);

    setFormData((current) => ({
      ...current,
      amount: String(remaining),
      installment_number: String(item.number),
    }));

    setShowAddDialog(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.student_id)
      errors.student_id = 'انتخاب شاگرد الزامی است';

    if (!formData.registration_id)
      errors.registration_id = 'انتخاب ثبت‌نام الزامی است';

    if (!formData.amount || Number(formData.amount) <= 0)
      errors.amount = 'مبلغ نامعتبر است';

    if (
      selectedRegistration &&
      Number(formData.amount) > registrationRemaining
    ) {
      errors.amount = `مبلغ بیشتر از مانده بدهی است: ${money(
        registrationRemaining
      )}`;
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm() || !selectedRegistration) return;

    setFormSaving(true);

    try {
      const result = await paymentService.recordPayment({
        student_id: selectedRegistration.student_id,
        registration_id: selectedRegistration.id,
        class_id: selectedRegistration.class_id,
        course_id: selectedRegistration.course_id,
        amount: Number(formData.amount),
        installment_number: formData.installment_number
          ? Number(formData.installment_number)
          : undefined,
        installment_title:
          selectedInstallment?.title ||
          (formData.installment_number
            ? `قسط ${formData.installment_number}`
            : undefined),
        due_date: selectedInstallment?.due_date,
        payment_date_jalali: formData.payment_date_jalali,
        status: 'paid',
        method: formData.method as Payment['method'],
        description: formData.description,
        recorded_by: 'admin',
      });

      if (!result.success) {
        setFormErrors({
          general: result.error || 'خطا در ثبت پرداخت',
        });
        return;
      }

      setShowAddDialog(false);

      await loadPayments();
      await loadRegistrations(selectedRegistration.student_id);
      await loadRegistrationPayments(selectedRegistration.id);

      const fresh =
        (await registrationService.getAll()).find(
          (r: any) => r.id === selectedRegistration.id
        ) || null;

      setSelectedRegistration(fresh);
      resetForm();
    } finally {
      setFormSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: selectedRegistration?.student_id || '',
      registration_id: selectedRegistration?.id || '',
      amount: '',
      installment_number: '',
      payment_date_jalali: '',
      method: 'cash',
      description: '',
    });

    setFormErrors({});
    setSelectedInstallment(null);
  };

  const handleDelete = async () => {
    if (!deletingPayment) return;

    const result = await paymentService.delete(deletingPayment.id);

    if (!result.success) {
      console.error(result.error);
      return;
    }

    setShowDeleteConfirm(false);
    setDeletingPayment(null);

    await loadPayments();

    if (selectedRegistration) {
      await loadRegistrationPayments(selectedRegistration.id);
    }
  };

  const paidTotal = rows
    .filter((row) => row.payment.status === 'paid')
    .reduce((sum, row) => sum + row.payment.amount, 0);

  const overdueTotal = rows
    .filter((row) => row.payment.status === 'overdue')
    .reduce((sum, row) => sum + row.payment.amount, 0);

  const debtorCount = rows.filter(
    (row) =>
      row.payment.status === 'pending' ||
      row.payment.status === 'overdue'
  ).length;

  const columns: Column[] = [
    {
      key: 'payment_date',
      title: 'تاریخ پرداخت',
      sortable: true,
      render: (row) =>
        row.payment.payment_date_jalali ||
        new Date(row.payment.payment_date).toLocaleDateString('fa-IR'),
    },
    {
      key: 'student',
      title: 'شاگرد',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>{row.studentName}</span>
      ),
    },
    {
      key: 'class',
      title: 'کلاس',
      render: (row) => row.className,
    },
    {
      key: 'installment',
      title: 'قسط',
      render: (row) =>
        row.payment.installment_number
          ? `قسط ${row.payment.installment_number}`
          : '—',
    },
    {
      key: 'amount',
      title: 'مبلغ',
      sortable: true,
      render: (row) => (
        <strong>{money(row.payment.amount)}</strong>
      ),
    },
    {
      key: 'method',
      title: 'روش',
      render: (row) => {
        const labels: Record<string, string> = {
          cash: 'نقد',
          card: 'کارت',
          transfer: 'انتقال',
          check: 'چک',
        };

        return labels[row.payment.method] || row.payment.method;
      },
    },
    {
      key: 'status',
      title: 'وضعیت',
      render: (row) => (
        <Badge
          variant={
            row.payment.status === 'paid'
              ? 'success'
              : row.payment.status === 'overdue'
              ? 'danger'
              : 'warning'
          }
        >
          {row.payment.status === 'paid'
            ? 'پرداخت شده'
            : row.payment.status === 'overdue'
            ? 'معوق'
            : 'در انتظار'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'عملیات',
      render: (row) => (
        <button
          onClick={(event) => {
            event.stopPropagation();
            setDeletingPayment(row.payment);
            setShowDeleteConfirm(true);
          }}
          style={{
            background: 'none',
            border: 0,
            color: 'var(--color-danger)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          حذف
        </button>
      ),
    },
  ];

  return (
    <div style={{ padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 700,
              margin: 0,
            }}
          >
            مدیریت مالی و شهریه
          </h1>

          <div
            style={{
              marginTop: '0.4rem',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            مدیریت شهریه، اقساط، پرداخت‌ها و بدهی شاگردان
          </div>
        </div>

        <Button
          onClick={() => {
            setSelectedRegistration(null);
            setSelectedInstallment(null);
            setFormData({
              student_id: '',
              registration_id: '',
              amount: '',
              installment_number: '',
              payment_date_jalali: '',
              method: 'cash',
              description: '',
            });
            setShowAddDialog(true);
          }}
        >
          ثبت پرداخت جدید
        </Button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <SummaryBox
          title="مجموع دریافتی"
          value={money(paidTotal)}
          color="var(--color-success)"
        />

        <SummaryBox
          title="پرداخت‌های معوق"
          value={money(overdueTotal)}
          color="var(--color-danger)"
        />

        <SummaryBox
          title="پرداخت‌ها"
          value={totalCount.toLocaleString('fa-IR')}
          color="var(--color-primary-400)"
        />

        <SummaryBox
          title="پرداخت‌های نیازمند پیگیری"
          value={debtorCount.toLocaleString('fa-IR')}
          color="var(--color-warning)"
        />
      </div>

      <Card padding="1rem" style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 1fr) minmax(260px, 1fr)',
            gap: '1rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.4rem',
              }}
            >
              جستجو
            </div>

            <SearchInput
              placeholder="نام شاگرد یا پرداخت..."
              value={filters.search}
              onChange={(value) =>
                usePaymentStore
                  .getState()
                  .setFilters({ search: value, page: 1 })
              }
            />
          </div>

          <Select
            label="وضعیت پرداخت"
            placeholder="همه وضعیت‌ها"
            options={[
              { value: 'paid', label: 'پرداخت شده' },
              { value: 'pending', label: 'در انتظار' },
              { value: 'overdue', label: 'معوق' },
              { value: 'cancelled', label: 'لغو شده' },
            ]}
            value={filters.status || ''}
            onChange={(value) =>
              usePaymentStore
                .getState()
                .setFilters({ status: value || null, page: 1 })
            }
          />
        </div>
      </Card>

      {selectedRegistration && (
        <Card
          padding="1.25rem"
          style={{
            marginBottom: '1.5rem',
            border: '1px solid var(--color-primary-500)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
            }}
          >
            <div>
              <div
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                پرونده مالی ثبت‌نام
              </div>

              <h2
                style={{
                  margin: '0.25rem 0',
                  fontSize: 'var(--font-size-lg)',
                }}
              >
                {selectedRegistration.registration_number}
              </h2>
            </div>

            <Badge
              variant={
                registrationRemaining <= 0
                  ? 'success'
                  : registrationPaid > 0
                  ? 'warning'
                  : 'danger'
              }
            >
              {registrationRemaining <= 0
                ? 'تسویه کامل'
                : registrationPaid > 0
                ? 'پرداخت ناقص'
                : 'بدهکار'}
            </Badge>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '0.75rem',
              marginBottom: '1.25rem',
            }}
          >
            <FinanceMini
              title="شهریه"
              value={money(selectedRegistration.tuition_fee)}
            />

            <FinanceMini
              title="ثبت‌نام"
              value={money(selectedRegistration.registration_fee)}
            />

            <FinanceMini
              title="تخفیف"
              value={money(selectedRegistration.discount)}
            />

            <FinanceMini
              title="مبلغ نهایی"
              value={money(registrationTotal)}
            />

            <FinanceMini
              title="پرداخت‌شده"
              value={money(registrationPaid)}
            />

            <FinanceMini
              title="مانده بدهی"
              value={money(registrationRemaining)}
              danger={registrationRemaining > 0}
            />
          </div>

          <div>
            <h3
              style={{
                fontSize: 'var(--font-size-md)',
                margin: '0 0 0.75rem',
              }}
            >
              برنامه اقساط
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  plan.length > 1
                    ? 'repeat(2, minmax(0, 1fr))'
                    : '1fr',
                gap: '0.75rem',
              }}
            >
              {plan.map((item) => {
                const paid = installmentPaid(item.number);
                const remaining = installmentRemaining(item);
                const isPaid = remaining <= 0;

                return (
                  <div
                    key={item.number}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: 'var(--border-default)',
                      background: 'var(--color-bg-secondary)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <strong>
                        {item.title || `قسط ${item.number}`}
                      </strong>

                      <Badge
                        variant={isPaid ? 'success' : 'warning'}
                      >
                        {isPaid ? 'تسویه' : 'باز'}
                      </Badge>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.5rem',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      <div>
                        مبلغ قسط:
                        <strong> {money(item.amount)}</strong>
                      </div>

                      <div>
                        پرداخت:
                        <strong> {money(paid)}</strong>
                      </div>

                      <div>
                        مانده:
                        <strong
                          style={{
                            color:
                              remaining > 0
                                ? 'var(--color-danger)'
                                : 'var(--color-success)',
                          }}
                        >
                          {' '}
                          {money(remaining)}
                        </strong>
                      </div>

                      <div>
                        سررسید:
                        <strong>
                          {' '}
                          {item.due_date || 'تعیین نشده'}
                        </strong>
                      </div>
                    </div>

                    {!isPaid && (
                      <Button
                        style={{
                          width: '100%',
                          marginTop: '0.85rem',
                        }}
                        onClick={() => openInstallmentPayment(item)}
                      >
                        ثبت پرداخت این قسط
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <Table
        columns={columns}
        data={rows}
        rowKey={(row) => row.payment.id}
        isLoading={isLoading}
        sortBy={filters.sortBy}
        sortDirection={filters.sortDirection}
        onSort={(key) =>
          usePaymentStore.getState().setFilters({
            sortBy: key,
            sortDirection:
              filters.sortBy === key &&
              filters.sortDirection === 'asc'
                ? 'desc'
                : 'asc',
          })
        }
        emptyState={
          <EmptyState
            title="هیچ پرداختی ثبت نشده است"
            description="برای ثبت اولین پرداخت از دکمه ثبت پرداخت جدید استفاده کنید"
            action={
              <Button onClick={() => setShowAddDialog(true)}>
                ثبت پرداخت جدید
              </Button>
            }
          />
        }
      />

      <Pagination
        page={filters.page}
        perPage={filters.perPage}
        total={totalCount}
        label="پرداخت"
        onPageChange={(page) =>
          usePaymentStore.getState().setFilters({ page })
        }
        onPerPageChange={(perPage) =>
          usePaymentStore
            .getState()
            .setFilters({ perPage, page: 1 })
        }
      />

      <Modal
        isOpen={showAddDialog}
        onClose={() => {
          if (!formSaving) setShowAddDialog(false);
        }}
        title={
          selectedInstallment
            ? `ثبت پرداخت ${selectedInstallment.title || `قسط ${selectedInstallment.number}`}`
            : 'ثبت پرداخت جدید'
        }
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowAddDialog(false)}
              disabled={formSaving}
            >
              انصراف
            </Button>

            <Button onClick={handleAdd} disabled={formSaving}>
              {formSaving ? 'در حال ثبت...' : 'ثبت پرداخت'}
            </Button>
          </>
        }
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {formErrors.general && (
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-danger-light)',
                color: 'var(--color-danger)',
              }}
            >
              {formErrors.general}
            </div>
          )}

          {!selectedRegistration && (
            <>
              <Select
                label="شاگرد"
                placeholder="انتخاب شاگرد..."
                options={studentsList.map((student) => ({
                  value: student.id,
                  label: `${student.first_name} ${student.last_name}`,
                }))}
                value={formData.student_id}
                onChange={handleStudentChange}
                error={formErrors.student_id}
              />

              <Select
                label="ثبت‌نام"
                placeholder={
                  formData.student_id
                    ? 'انتخاب ثبت‌نام...'
                    : 'ابتدا شاگرد را انتخاب کنید'
                }
                options={registrationsList.map((registration) => ({
                  value: registration.id,
                  label: `${registration.registration_number} — ${money(
                    getRegistrationTotal(registration)
                  )}`,
                }))}
                value={formData.registration_id}
                onChange={handleRegistrationChange}
                disabled={!formData.student_id}
                error={formErrors.registration_id}
              />
            </>
          )}

          {selectedRegistration && (
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)',
              }}
            >
              <div
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                مانده بدهی
              </div>

              <div
                style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 700,
                  color:
                    registrationRemaining > 0
                      ? 'var(--color-danger)'
                      : 'var(--color-success)',
                }}
              >
                {money(registrationRemaining)}
              </div>
            </div>
          )}

          <Input
            label="مبلغ پرداخت (تومان)"
            type="number"
            value={formData.amount}
            onChange={(event) =>
              setFormData({
                ...formData,
                amount: event.target.value,
              })
            }
            error={formErrors.amount}
          />

          <Input
            label="تاریخ پرداخت"
            value={formData.payment_date_jalali}
            onChange={(event) =>
              setFormData({
                ...formData,
                payment_date_jalali: event.target.value,
              })
            }
            placeholder="۱۴۰۳/۰۴/۱۵"
          />

          <Select
            label="روش پرداخت"
            options={[
              { value: 'cash', label: 'نقد' },
              { value: 'card', label: 'کارت' },
              { value: 'transfer', label: 'انتقال بانکی' },
              { value: 'check', label: 'چک' },
            ]}
            value={formData.method}
            onChange={(value) =>
              setFormData({
                ...formData,
                method: value,
              })
            }
          />

          <div>
            <label
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                display: 'block',
                marginBottom: '0.375rem',
              }}
            >
              توضیحات
            </label>

            <textarea
              value={formData.description}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  description: event.target.value,
                })
              }
              style={{
                width: '100%',
                minHeight: 80,
                padding: '0.75rem',
                background: 'var(--color-input)',
                border: 'var(--border-default)',
                borderRadius: 'var(--radius-input)',
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="حذف پرداخت"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
            >
              انصراف
            </Button>

            <Button
              onClick={handleDelete}
              style={{ color: 'var(--color-danger)' }}
            >
              حذف پرداخت
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>
          آیا از حذف این پرداخت اطمینان دارید؟
        </p>
      </Modal>
    </div>
  );
};

function SummaryBox({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <Card padding="1rem" style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          marginBottom: '0.25rem',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 'var(--font-size-md)',
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
    </Card>
  );
}

function FinanceMini({
  title,
  value,
  danger = false,
}: {
  title: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        padding: '0.8rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-secondary)',
      }}
    >
      <div
        style={{
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--font-size-xs)',
          marginBottom: '0.25rem',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontWeight: 700,
          color: danger
            ? 'var(--color-danger)'
            : 'var(--color-text-primary)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
