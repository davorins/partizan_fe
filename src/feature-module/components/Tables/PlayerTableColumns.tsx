// components/Tables/PlayerTableColumns.tsx
import React from 'react';
import { TableProps, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import { formatDate, formatDateForStorage } from '../../../utils/dateFormatter';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PlayerTableData } from '../../../types/playerTypes';

interface PlayerTableColumnsProps {
  handlePlayerClick: (record: PlayerTableData) => void;
  location: any;
  seasonFilter?: {
    currentSeason: string;
    currentYear: number;
  };
  loading?: boolean;
}

// Skeleton loader for table rows
export const PlayerTableSkeleton: React.FC<{ rows?: number }> = ({
  rows = 10,
}) => {
  return (
    <div className='player-table-skeleton'>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className='skeleton-row d-flex align-items-center p-3 border-bottom'
        >
          <div className='d-flex align-items-center w-100'>
            {/* Avatar skeleton */}
            <Skeleton.Avatar
              active
              size='large'
              shape='circle'
              className='me-3 flex-shrink-0'
            />
            {/* Name skeleton */}
            <div className='flex-grow-1'>
              <Skeleton.Input
                active
                size='small'
                style={{ width: 120, height: 16 }}
                className='mb-1'
              />
            </div>
            {/* Other columns */}
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
                style={{ width: 40, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 100, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 60, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 120, height: 16 }}
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
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const getPlayerStatus = (
  player: PlayerTableData
): 'Active' | 'Inactive' | 'Pending Payment' => {
  // Check explicit status first
  if (player.status) {
    if (typeof player.status === 'string') {
      if (player.status.toLowerCase() === 'active') return 'Active';
      if (player.status.toLowerCase() === 'pending') return 'Pending Payment';
      return 'Inactive';
    }
    return player.status ? 'Active' : 'Inactive';
  }

  // Fixed the logical error - removed incorrect nullish coalescing
  const registrationComplete =
    player.registrationComplete ?? player.paymentInfo?.status !== 'failed';

  const paymentComplete =
    player.paymentComplete ?? player.paymentInfo?.status === 'paid';

  if (registrationComplete && paymentComplete) return 'Active';
  if (registrationComplete && !paymentComplete) return 'Pending Payment';
  return 'Inactive';
};

// Helper function to get filtered season info
const getFilteredSeasonInfo = (
  player: PlayerTableData,
  filter?: { currentSeason: string; currentYear: number }
) => {
  if (!filter || !filter.currentSeason || !filter.currentYear) {
    return player.season
      ? `${player.season} ${player.registrationYear}`
      : 'N/A';
  }

  const matchingSeason = player.seasons?.find(
    (s) => s.season === filter.currentSeason && s.year === filter.currentYear
  );

  return matchingSeason
    ? `${matchingSeason.season} ${matchingSeason.year}`
    : 'N/A';
};

// Helper function to get payment status for filtered season
const getFilteredPaymentStatus = (
  player: PlayerTableData,
  filter?: { currentSeason: string; currentYear: number }
) => {
  if (!filter || !filter.currentSeason || !filter.currentYear) {
    return player.paymentStatus || 'N/A';
  }

  const matchingSeason = player.seasons?.find(
    (s) => s.season === filter.currentSeason && s.year === filter.currentYear
  );

  return matchingSeason?.paymentStatus || player.paymentStatus || 'N/A';
};

// UPDATED: Get compact seasons display with year grouping
const getCompactSeasonsDisplay = (player: PlayerTableData): string => {
  if (!player.seasons || player.seasons.length === 0) {
    return player.season
      ? `${player.season} ${player.registrationYear || ''}`.trim()
      : 'No Seasons';
  }

  // Group seasons by year
  const seasonsByYear: { [year: number]: string[] } = {};

  player.seasons.forEach((season) => {
    const year = season.year;
    if (!seasonsByYear[year]) {
      seasonsByYear[year] = [];
    }

    // Use full season names but abbreviated for common terms
    let seasonName = season.season;
    if (seasonName.includes('Basketball Select Tryout')) {
      seasonName = 'Select Tryout';
    } else if (seasonName.includes('Basketball Select Team')) {
      seasonName = 'Select Team';
    } else if (seasonName.includes('Basketball Select')) {
      seasonName = 'Select';
    } else if (seasonName.includes('Tryout')) {
      seasonName = seasonName.replace('Tryout', 'Try');
    }

    seasonsByYear[year].push(seasonName);
  });

  // Create compact display with year only shown once per group
  const display = Object.keys(seasonsByYear)
    .map((year) => {
      const yearNum = parseInt(year);
      const seasons = seasonsByYear[yearNum];

      // Remove duplicates using Array.filter instead of Set
      const uniqueSeasons: string[] = [];
      seasons.forEach((season) => {
        if (uniqueSeasons.indexOf(season) === -1) {
          uniqueSeasons.push(season);
        }
      });

      return `${uniqueSeasons.join('/')} ${yearNum}`;
    })
    .join(', ');

  return display || 'No Seasons';
};

// UPDATED: Get payment status badge for seasons
const getSeasonsPaymentStatus = (player: PlayerTableData): React.ReactNode => {
  if (!player.seasons || player.seasons.length === 0) {
    const status = getPlayerStatus(player);
    return (
      <span
        className={`badge badge-soft-${
          status === 'Active'
            ? 'success'
            : status === 'Pending Payment'
            ? 'warning'
            : 'danger'
        } d-inline-flex align-items-center`}
      >
        <i
          className={`ti ti-circle-filled fs-5 me-1 ${
            status === 'Active'
              ? 'text-success'
              : status === 'Pending Payment'
              ? 'text-warning'
              : 'text-danger'
          }`}
        ></i>
        {status}
      </span>
    );
  }

  // Count paid vs pending seasons
  const paidSeasons = player.seasons.filter(
    (s) => s.paymentStatus === 'paid' || s.paymentComplete
  ).length;
  const totalSeasons = player.seasons.length;

  if (paidSeasons === totalSeasons) {
    return (
      <span className='badge badge-soft-success d-inline-flex align-items-center'>
        <i className='ti ti-circle-filled fs-5 me-1 text-success'></i>
        All Paid
      </span>
    );
  } else if (paidSeasons > 0) {
    return (
      <span className='badge badge-soft-warning d-inline-flex align-items-center'>
        <i className='ti ti-circle-filled fs-5 me-1 text-warning'></i>
        {paidSeasons}/{totalSeasons} Paid
      </span>
    );
  } else {
    return (
      <span className='badge badge-soft-danger d-inline-flex align-items-center'>
        <i className='ti ti-circle-filled fs-5 me-1 text-danger'></i>
        No Payments
      </span>
    );
  }
};

// UPDATED: Get seasons tooltip content for hover
const getSeasonsTooltip = (player: PlayerTableData): string => {
  if (!player.seasons || player.seasons.length === 0) {
    return player.season
      ? `${player.season} ${player.registrationYear || ''}`.trim()
      : 'No season data';
  }

  return player.seasons
    .map((season) => {
      const paymentStatus =
        season.paymentStatus || (season.paymentComplete ? 'paid' : 'pending');
      const amount = season.amountPaid ? `$${season.amountPaid}` : '';
      const date = season.registrationDate
        ? `Registered: ${formatDate(season.registrationDate)}`
        : '';
      return `${season.season} ${season.year} (${paymentStatus}${
        amount ? ` - ${amount}` : ''
      })${date ? ` - ${date}` : ''}`;
    })
    .join('\n');
};

export const exportPlayersToPDF = <T extends PlayerTableData>(data: T[]) => {
  console.log(
    'Exporting players to PDF:',
    data.map((p) => ({ id: p.id, name: p.name, parents: p.parents }))
  );
  const doc = new jsPDF();
  doc.text('Players List', 14, 15);

  const tableColumn = [
    'Name',
    'Gender',
    'Age',
    'School',
    'Grade',
    'AAU#',
    'Seasons',
    'Status',
  ];

  const tableRows = data.map((item) => [
    item.name ?? 'N/A',
    item.gender ?? 'N/A',
    item.age ?? 'N/A',
    item.section ?? 'N/A',
    item.class ?? 'N/A',
    item.aauNumber ?? 'N/A',
    getCompactSeasonsDisplay(item),
    getPlayerStatus(item),
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows as (string | number)[][],
    startY: 25,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 'auto' },
      6: { cellWidth: 'auto' },
      7: { cellWidth: 'auto' },
    },
  });

  doc.save(`players_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportPlayersToExcel = <T extends PlayerTableData>(data: T[]) => {
  console.log(
    'Exporting players to Excel:',
    data.map((p) => ({ id: p.id, name: p.name, parents: p.parents }))
  );
  const worksheet = XLSX.utils.json_to_sheet(
    data.map((item) => ({
      Name: item.name ?? 'N/A',
      Gender: item.gender ?? 'N/A',
      Age: item.age ?? 'N/A',
      School: item.section ?? 'N/A',
      Grade: item.class ?? 'N/A',
      AAU: item.aauNumber ?? 'N/A',
      Seasons: getCompactSeasonsDisplay(item),
      Status: getPlayerStatus(item),
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Players');
  XLSX.writeFile(
    workbook,
    `players_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};

export const exportPlayerParentEmails = <T extends PlayerTableData>(
  data: T[]
) => {
  console.log(
    'Players for email export:',
    data.map((p) => ({ id: p.id, name: p.name, parents: p.parents }))
  );
  const uniqueEmails = Array.from(
    new Set(
      data
        .flatMap((player) =>
          player.parents?.map((parent) => parent.email?.trim())
        )
        .filter((email): email is string => !!email && email.includes('@'))
    )
  );

  console.log('Unique emails found:', uniqueEmails);

  if (uniqueEmails.length === 0) {
    const hasParents = data.some(
      (player) => player.parents && player.parents.length > 0
    );
    const message = hasParents
      ? 'No valid parent email addresses found to export. Ensure parents have valid emails.'
      : 'No parents associated with the selected players.';
    console.log('Export error:', message);
    alert(message);
    return;
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + uniqueEmails.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `player_parent_emails_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const copyPlayerParentEmailsToClipboard = <T extends PlayerTableData>(
  data: T[],
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void
) => {
  console.log(
    'Players for email copy:',
    data.map((p) => ({ id: p.id, name: p.name, parents: p.parents }))
  );
  const uniqueEmails = Array.from(
    new Set(
      data
        .flatMap((player) =>
          player.parents?.map((parent) => parent.email?.trim())
        )
        .filter((email): email is string => !!email && email.includes('@'))
    )
  );

  console.log('Unique emails found:', uniqueEmails);

  if (uniqueEmails.length === 0) {
    const hasParents = data.some(
      (player) => player.parents && player.parents.length > 0
    );
    const message = hasParents
      ? 'No valid parent email addresses found to copy. Ensure parents have valid emails.'
      : 'No parents associated with the selected players.';
    console.log('Copy error:', message);
    onError?.(message);
    return false;
  }

  const emailString = uniqueEmails.join(', ');

  navigator.clipboard
    .writeText(emailString)
    .then(() => {
      onSuccess?.('Parent email list copied to clipboard!');
    })
    .catch((err) => {
      console.error('Failed to copy parent emails: ', err);
      onError?.('Failed to copy parent emails to clipboard');
    });

  return true;
};

const formatDOBWithoutShift = (dob: string | Date | undefined): string => {
  if (!dob) return 'N/A';

  try {
    if (typeof dob === 'string' && dob.includes('T')) {
      const date = new Date(dob);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${month}/${day}/${year}`;
    }
    return formatDate(dob);
  } catch (error) {
    console.error('Error formatting DOB:', error);
    return 'N/A';
  }
};

export const getPlayerTableColumns = ({
  handlePlayerClick,
  location,
  seasonFilter,
  loading = false,
}: PlayerTableColumnsProps): TableProps<PlayerTableData>['columns'] => {
  const getAvatarUrl = (
    avatar: string | undefined,
    gender: string | undefined
  ): string => {
    if (!avatar) {
      return gender === 'Female'
        ? 'https://partizan-be.onrender.com/uploads/avatars/girl.png'
        : 'https://partizan-be.onrender.com/uploads/avatars/boy.png';
    }

    if (avatar.includes('res.cloudinary.com')) {
      return `${avatar}${avatar.includes('?') ? '&' : '?'}${Date.now()}`;
    }

    if (avatar.startsWith('/uploads/')) {
      return `https://partizan-be.onrender.com${avatar}`;
    }

    return avatar;
  };

  // If loading, return skeleton columns
  if (loading) {
    return [
      {
        title: 'Name',
        dataIndex: 'name',
        width: 200,
        render: () => (
          <div className='d-flex align-items-center'>
            <Skeleton.Avatar active size='large' shape='circle' />
            <div className='ms-2'>
              <Skeleton.Input
                active
                size='small'
                style={{ width: 120, height: 16 }}
              />
            </div>
          </div>
        ),
      },
      {
        title: 'Gender',
        dataIndex: 'gender',
        width: 100,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 60, height: 16 }}
          />
        ),
      },
      {
        title: 'DOB',
        dataIndex: 'dob',
        width: 110,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 80, height: 16 }}
          />
        ),
      },
      {
        title: 'Age',
        dataIndex: 'age',
        width: 80,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 40, height: 16 }}
          />
        ),
      },
      {
        title: 'School Name',
        dataIndex: 'section',
        width: 150,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 100, height: 16 }}
          />
        ),
      },
      {
        title: 'Grade',
        dataIndex: 'class',
        width: 100,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 60, height: 16 }}
          />
        ),
      },
      {
        title: 'Seasons',
        key: 'seasons',
        width: 180,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 120, height: 16 }}
          />
        ),
      },
      {
        title: 'Status',
        key: 'status',
        width: 130,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 80, height: 16 }}
          />
        ),
      },
      {
        title: 'AAU Number',
        dataIndex: 'aauNumber',
        width: 120,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 80, height: 16 }}
          />
        ),
      },
      {
        title: 'Action',
        dataIndex: 'action',
        width: 100,
        render: () => (
          <Skeleton.Button
            active
            size='small'
            style={{ width: 40, height: 32 }}
          />
        ),
      },
    ];
  }

  return [
    {
      title: 'Name',
      dataIndex: 'name',
      width: 200,
      render: (text: string, record: PlayerTableData) => {
        const avatarUrl = getAvatarUrl(record.avatar, record.gender);
        return (
          <div className='d-flex align-items-center'>
            <div
              onClick={() => handlePlayerClick(record)}
              className='avatar avatar-md cursor-pointer flex-shrink-0'
            >
              <img
                src={avatarUrl}
                className='img-fluid rounded-circle'
                alt={`${record.name || 'Player'} avatar`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = getAvatarUrl(undefined, record.gender);
                }}
              />
            </div>
            <div className='ms-2 flex-grow-1 min-width-0'>
              <p
                className='cursor-pointer text-primary mb-0 text-truncate'
                style={{ maxWidth: '150px' }}
                title={text}
              >
                <span
                  onClick={() => handlePlayerClick(record)}
                  className='cursor-pointer'
                >
                  {text}
                </span>
              </p>
            </div>
          </div>
        );
      },
      sorter: (a: PlayerTableData, b: PlayerTableData) =>
        (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      width: 100,
      sorter: (a: PlayerTableData, b: PlayerTableData) =>
        (a.gender || '').localeCompare(b.gender || ''),
    },
    {
      title: 'DOB',
      dataIndex: 'dob',
      width: 110,
      render: formatDOBWithoutShift,
      sorter: (a: PlayerTableData, b: PlayerTableData) => {
        const dateA = new Date(formatDateForStorage(a.dob));
        const dateB = new Date(formatDateForStorage(b.dob));
        return dateA.getTime() - dateB.getTime();
      },
    },
    {
      title: 'Age',
      dataIndex: 'age',
      width: 80,
      sorter: (a: PlayerTableData, b: PlayerTableData) =>
        (a.age || 0) - (b.age || 0),
    },
    {
      title: 'School Name',
      dataIndex: 'section',
      width: 150,
      render: (text: string) => (
        <span
          className='text-truncate d-inline-block'
          style={{ maxWidth: '140px' }}
          title={text}
        >
          {text}
        </span>
      ),
      sorter: (a: PlayerTableData, b: PlayerTableData) =>
        (a.section || '').localeCompare(b.section || ''),
    },
    {
      title: 'Grade',
      dataIndex: 'class',
      width: 100,
      sorter: (a: PlayerTableData, b: PlayerTableData) =>
        (a.class || '').localeCompare(b.class || ''),
    },
    {
      title: 'Seasons',
      key: 'seasons',
      width: 180,
      render: (_: unknown, record: PlayerTableData) => (
        <div
          className='seasons-display'
          title={getSeasonsTooltip(record)}
          style={{ cursor: 'help' }}
        >
          <span
            className='text-dark fw-medium text-truncate d-inline-block'
            style={{ maxWidth: '170px' }}
          >
            {getCompactSeasonsDisplay(record)}
          </span>
        </div>
      ),
      sorter: (a: PlayerTableData, b: PlayerTableData) => {
        const seasonsA = getCompactSeasonsDisplay(a);
        const seasonsB = getCompactSeasonsDisplay(b);
        return seasonsA.localeCompare(seasonsB);
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 130,
      render: (_: unknown, record: PlayerTableData) => {
        return getSeasonsPaymentStatus(record);
      },
      sorter: (a: PlayerTableData, b: PlayerTableData) => {
        const statusA = getPlayerStatus(a);
        const statusB = getPlayerStatus(b);
        return statusA.localeCompare(statusB);
      },
    },
    {
      title: 'AAU Number',
      dataIndex: 'aauNumber',
      width: 120,
      sorter: (a: PlayerTableData, b: PlayerTableData) =>
        (a.aauNumber || '').localeCompare(b.aauNumber || ''),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: 100,
      render: (_: unknown, record: PlayerTableData) => (
        <div className='d-flex align-items-center'>
          <div className='dropdown'>
            <Link
              to='#'
              className='btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0'
              data-bs-toggle='dropdown'
              aria-expanded='false'
            >
              <i className='ti ti-dots-vertical fs-14' />
            </Link>
            <ul className='dropdown-menu dropdown-menu-right p-3'>
              <li>
                <div
                  className='dropdown-item rounded-1 cursor-pointer'
                  onClick={() => handlePlayerClick(record)}
                >
                  <i className='ti ti-menu me-2' />
                  View
                </div>
              </li>
              <li>
                <Link
                  to={`${all_routes.editPlayer}/${record.id}`}
                  state={{
                    player: {
                      ...record,
                      playerId: record.id,
                      _id: record.id,
                    },
                    from: location.pathname,
                  }}
                  className='dropdown-item rounded-1'
                >
                  <i className='ti ti-edit me-2' />
                  Edit
                </Link>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];
};
