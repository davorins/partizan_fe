// components/Tables/TeamTableColumns.tsx
import React from 'react';
import { TableProps, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { InternalTeamTableData } from '../../../types/teamTypes';

const teamRoutes = {
  teamDetail: '/teams/detail',
  editTeam: '/teams/edit',
};

interface TeamTableColumnsProps {
  handleDeleteTeam: (teamId: string, teamName: string) => void;
  handleToggleTeamStatus: (teamId: string, currentStatus: string) => void;
  location: any;
  loading?: boolean;
  currentUserRole?: string;
  visibleFields?: string[];
}

export const TeamTableSkeleton: React.FC<{ rows?: number }> = ({
  rows = 10,
}) => {
  return (
    <div className='team-table-skeleton'>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className='skeleton-row d-flex align-items-center p-3 border-bottom'
        >
          <div className='d-flex align-items-center w-100'>
            <Skeleton.Avatar
              active
              size='large'
              shape='circle'
              className='me-3 flex-shrink-0'
            />
            <div className='flex-grow-1'>
              <Skeleton.Input
                active
                size='small'
                style={{ width: 150, height: 16 }}
                className='mb-1'
              />
            </div>
            <div className='d-flex gap-4 flex-wrap'>
              <Skeleton.Input
                active
                size='small'
                style={{ width: 60, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 80, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 80, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 60, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 60, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 100, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 80, height: 16 }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const getTeamStatus = (
  team: InternalTeamTableData,
): 'Active' | 'Inactive' | 'Pending Payment' => {
  if (team.status === 'active') return 'Active';
  if (team.status === 'pending') return 'Pending Payment';
  return 'Inactive';
};

// ✅ Updated exportTeamsToPDF with visibility support
export const exportTeamsToPDF = <T extends InternalTeamTableData>(
  data: T[],
  visibleFields?: string[],
) => {
  const doc = new jsPDF();
  doc.text('Teams List', 14, 15);

  // Check visibility for each field
  const showName = true; // Always show name
  const showYear = !visibleFields || visibleFields.includes('year');
  const showGrade = !visibleFields || visibleFields.includes('grade');
  const showGender = !visibleFields || visibleFields.includes('gender');
  const showPlayers = !visibleFields || visibleFields.includes('playerCount');
  const showCoaches = !visibleFields || visibleFields.includes('coachCount');
  const showTryoutSeason =
    !visibleFields || visibleFields.includes('tryoutSeason');
  const showStatus = true; // Always show status

  // Build dynamic columns
  const tableColumn: string[] = ['Team Name'];
  const tableRows = data.map((item) => {
    const row: any[] = [item.name ?? 'N/A'];

    if (showYear) row.push(item.year?.toString() ?? 'N/A');
    if (showGrade) row.push(item.grade ? `Grade ${item.grade}` : 'N/A');
    if (showGender) row.push(item.gender ?? 'N/A');
    if (showPlayers) row.push(item.playerCount?.toString() ?? '0');
    if (showCoaches) row.push(item.coachCount?.toString() ?? '0');
    if (showTryoutSeason) row.push(item.tryoutSeason ?? '-');
    if (showStatus) row.push(getTeamStatus(item));

    return row;
  });

  // Add headers based on visibility
  if (showYear) tableColumn.push('Year');
  if (showGrade) tableColumn.push('Grade');
  if (showGender) tableColumn.push('Gender');
  if (showPlayers) tableColumn.push('Players');
  if (showCoaches) tableColumn.push('Coaches');
  if (showTryoutSeason) tableColumn.push('Tryout Season');
  if (showStatus) tableColumn.push('Status');

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows as (string | number)[][],
    startY: 25,
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: Object.fromEntries(
      tableColumn.map((_, i) => [i, { cellWidth: 'auto' }]),
    ),
  });
  doc.save(`teams_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ✅ Updated exportTeamsToExcel with visibility support
export const exportTeamsToExcel = <T extends InternalTeamTableData>(
  data: T[],
  visibleFields?: string[], // Added parameter
) => {
  const showYear = !visibleFields || visibleFields.includes('year');
  const showGrade = !visibleFields || visibleFields.includes('grade');
  const showGender = !visibleFields || visibleFields.includes('gender');
  const showPlayers = !visibleFields || visibleFields.includes('playerCount');
  const showCoaches = !visibleFields || visibleFields.includes('coachCount');
  const showTryoutSeason =
    !visibleFields || visibleFields.includes('tryoutSeason');
  const showStatus = true;

  const excelData = data.map((item) => {
    const obj: any = {
      'Team Name': item.name ?? 'N/A',
    };

    if (showYear) obj.Year = item.year ?? 'N/A';
    if (showGrade) obj.Grade = item.grade ? `Grade ${item.grade}` : 'N/A';
    if (showGender) obj.Gender = item.gender ?? 'N/A';
    if (showPlayers) obj.Players = item.playerCount ?? 0;
    if (showCoaches) obj.Coaches = item.coachCount ?? 0;
    if (showTryoutSeason) obj['Tryout Season'] = item.tryoutSeason ?? '-';
    if (showStatus) obj.Status = getTeamStatus(item);

    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Teams');
  XLSX.writeFile(
    workbook,
    `teams_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};

export const getTeamTableColumns = ({
  handleDeleteTeam,
  handleToggleTeamStatus,
  location,
  loading = false,
  currentUserRole,
  visibleFields = [], // Added parameter
}: TeamTableColumnsProps): TableProps<InternalTeamTableData>['columns'] => {
  const resolveAvatar = (gender: string | undefined): string => {
    return gender === 'Female'
      ? 'https://partizan-be.onrender.com/uploads/avatars/girl.png'
      : 'https://partizan-be.onrender.com/uploads/avatars/boy.png';
  };

  // Check visibility for columns
  const isFieldVisible = (fieldName: string): boolean => {
    if (visibleFields.length === 0) return true; // If no config, show all
    return visibleFields.includes(fieldName);
  };

  if (loading) {
    // ... loading skeleton remains the same
    return [
      {
        title: 'Team Name',
        dataIndex: 'name',
        width: 220,
        render: () => (
          <div className='d-flex align-items-center'>
            <Skeleton.Avatar active size='large' shape='circle' />
            <div className='ms-2'>
              <Skeleton.Input
                active
                size='small'
                style={{ width: 150, height: 16 }}
              />
            </div>
          </div>
        ),
      },
      ...(isFieldVisible('year')
        ? [
            {
              title: 'Year',
              dataIndex: 'year',
              width: 80,
              render: () => (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: 60, height: 16 }}
                />
              ),
            },
          ]
        : []),
      ...(isFieldVisible('grade')
        ? [
            {
              title: 'Grade',
              dataIndex: 'grade',
              width: 100,
              render: () => (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: 80, height: 16 }}
                />
              ),
            },
          ]
        : []),
      ...(isFieldVisible('gender')
        ? [
            {
              title: 'Gender',
              dataIndex: 'gender',
              width: 100,
              render: () => (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: 80, height: 16 }}
                />
              ),
            },
          ]
        : []),
      ...(isFieldVisible('playerCount')
        ? [
            {
              title: 'Players',
              dataIndex: 'playerCount',
              width: 80,
              align: 'center' as const,
              render: () => (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: 60, height: 16 }}
                />
              ),
            },
          ]
        : []),
      ...(isFieldVisible('coachCount')
        ? [
            {
              title: 'Coaches',
              dataIndex: 'coachCount',
              width: 80,
              align: 'center' as const,
              render: () => (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: 60, height: 16 }}
                />
              ),
            },
          ]
        : []),
      ...(isFieldVisible('tryoutSeason')
        ? [
            {
              title: 'Tryout Season',
              dataIndex: 'tryoutSeason',
              width: 150,
              render: () => (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: 100, height: 16 }}
                />
              ),
            },
          ]
        : []),
      {
        title: 'Status',
        key: 'status',
        width: 130,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 100, height: 16 }}
          />
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 120,
        render: () => (
          <Skeleton.Button
            active
            size='small'
            style={{ width: 60, height: 32 }}
          />
        ),
      },
    ];
  }

  // Define columns - only include if visible
  const nameCol = {
    title: 'Team Name',
    dataIndex: 'name',
    width: 220,
    render: (text: string, record: InternalTeamTableData) => {
      const avatarUrl = resolveAvatar(record.gender);
      return (
        <div className='d-flex align-items-center'>
          <div className='avatar avatar-sm flex-shrink-0 me-2'>
            <img
              src={avatarUrl}
              className='img-fluid rounded-circle'
              alt={`${text} avatar`}
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'cover',
                border: '1px solid #e8e8e8',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = resolveAvatar(undefined);
              }}
            />
          </div>
          <div className='flex-grow-1 min-width-0'>
            <p
              className='cursor-pointer text-primary mb-0 text-truncate'
              style={{ maxWidth: '170px' }}
              title={text}
            >
              <Link
                to={`${teamRoutes.teamDetail}/${record.id}`}
                className='text-primary fw-medium'
              >
                {text}
              </Link>
            </p>
          </div>
        </div>
      );
    },
    sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
      (a.name || '').localeCompare(b.name || ''),
  };

  const yearCol = isFieldVisible('year')
    ? {
        title: 'Year',
        dataIndex: 'year',
        width: 80,
        sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
          (a.year || 0) - (b.year || 0),
      }
    : null;

  const gradeCol = isFieldVisible('grade')
    ? {
        title: 'Grade',
        dataIndex: 'grade',
        width: 100,
        render: (grade: string) => {
          if (!grade) return '-';
          const gradeNum = parseInt(grade);
          if (isNaN(gradeNum)) return grade;
          let suffix = 'th';
          if (gradeNum === 1) suffix = 'st';
          else if (gradeNum === 2) suffix = 'nd';
          else if (gradeNum === 3) suffix = 'rd';
          return `${gradeNum}${suffix} Grade`;
        },
        sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
          parseInt(a.grade || '0') - parseInt(b.grade || '0'),
      }
    : null;

  const genderCol = isFieldVisible('gender')
    ? {
        title: 'Gender',
        dataIndex: 'gender',
        width: 100,
        sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
          (a.gender || '').localeCompare(b.gender || ''),
      }
    : null;

  const playersCol = isFieldVisible('playerCount')
    ? {
        title: 'Players',
        dataIndex: 'playerCount',
        width: 80,
        align: 'center' as const,
        sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
          (a.playerCount || 0) - (b.playerCount || 0),
      }
    : null;

  const coachesCol = isFieldVisible('coachCount')
    ? {
        title: 'Coaches',
        dataIndex: 'coachCount',
        width: 80,
        align: 'center' as const,
        sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
          (a.coachCount || 0) - (b.coachCount || 0),
      }
    : null;

  const tryoutSeasonCol = isFieldVisible('tryoutSeason')
    ? {
        title: 'Tryout Season',
        dataIndex: 'tryoutSeason',
        width: 150,
        render: (tryoutSeason: string) => (
          <span className='text-muted'>{tryoutSeason || '-'}</span>
        ),
        sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
          (a.tryoutSeason || '').localeCompare(b.tryoutSeason || ''),
      }
    : null;

  const statusCol = {
    title: 'Status',
    key: 'status',
    width: 150,
    render: (_: unknown, record: InternalTeamTableData) => {
      const isActive = record.status === 'active';
      if (currentUserRole === 'admin') {
        return (
          <div className='d-flex align-items-center gap-2'>
            <div
              className='form-check form-switch mb-0'
              style={{ paddingLeft: '2.5em' }}
            >
              <input
                className='form-check-input'
                type='checkbox'
                role='switch'
                checked={isActive}
                onChange={() =>
                  handleToggleTeamStatus(record.id, record.status || 'active')
                }
                style={{ cursor: 'pointer', width: '2.2em', height: '1.2em' }}
              />
            </div>
            <span
              className={`fw-semibold small ${isActive ? 'text-success' : 'text-danger'}`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        );
      }
      const badgeColor = isActive ? 'success' : 'danger';
      return (
        <span
          className={`badge badge-soft-${badgeColor} d-inline-flex align-items-center`}
        >
          <i className={`ti ti-circle-filled fs-5 me-1 text-${badgeColor}`}></i>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      );
    },
    sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
      getTeamStatus(a).localeCompare(getTeamStatus(b)),
  };

  const actionCol = {
    title: 'Actions',
    key: 'actions',
    width: 120,
    align: 'center' as const,
    render: (_: unknown, record: InternalTeamTableData) => {
      const canEdit =
        currentUserRole === 'admin' || currentUserRole === 'coach';
      return (
        <div className='d-flex align-items-center justify-content-center gap-2'>
          <Link
            to={`${teamRoutes.teamDetail}/${record.id}`}
            state={{ from: location.pathname }}
          >
            <button
              className='btn btn-sm btn-icon btn-outline-secondary'
              title='View Details'
              style={{ width: '32px', height: '32px' }}
            >
              <i className='ti ti-eye fs-16' />
            </button>
          </Link>
          {canEdit && (
            <>
              <Link
                to={`${teamRoutes.editTeam}/${record.id}`}
                state={{
                  team: { ...record, _id: record.id },
                  from: location.pathname,
                }}
              >
                <button
                  className='btn btn-sm btn-icon btn-outline-warning'
                  title='Edit'
                  style={{ width: '32px', height: '32px' }}
                >
                  <i className='ti ti-edit fs-16' />
                </button>
              </Link>
              <button
                onClick={() => handleDeleteTeam(record.id, record.name)}
                className='btn btn-sm btn-icon btn-outline-danger'
                title='Delete'
                style={{ width: '32px', height: '32px' }}
              >
                <i className='ti ti-trash fs-16' />
              </button>
            </>
          )}
        </div>
      );
    },
  };

  // Build the final columns array - filter out null values
  return [
    nameCol,
    yearCol,
    gradeCol,
    genderCol,
    playersCol,
    coachesCol,
    tryoutSeasonCol,
    statusCol,
    actionCol,
  ].filter((col): col is NonNullable<typeof col> => col !== null);
};
