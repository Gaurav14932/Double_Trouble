import { ImageResponse } from 'next/og';
import type { PropertyTaxSummary } from './summary';

const CHART_IMAGE_SIZE = {
  width: 1200,
  height: 630,
};

export async function renderStatusChartPng(
  summary: PropertyTaxSummary
): Promise<Buffer> {
  const total = Math.max(summary.paid + summary.unpaid, 1);
  const paidDegrees = (summary.paid / total) * 360;
  const paidPercentage = Math.round((summary.paid / total) * 100);
  const unpaidPercentage = 100 - paidPercentage;

  const image = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'sans-serif',
          padding: '48px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            width: '42%',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 54,
              fontWeight: 800,
            }}
          >
            Property Tax Status
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              color: '#475569',
            }}
          >
            Paid vs outstanding properties from the current assistant dataset.
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginTop: '18px',
            }}
          >
            {buildLegendRow('#16a34a', 'Paid', `${summary.paid} properties`, `${paidPercentage}%`)}
            {buildLegendRow(
              '#dc2626',
              'Unpaid / Partial',
              `${summary.unpaid} properties`,
              `${unpaidPercentage}%`
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            width: '440px',
            height: '440px',
            borderRadius: '9999px',
            alignItems: 'center',
            justifyContent: 'center',
            background: `conic-gradient(#16a34a 0deg ${paidDegrees}deg, #dc2626 ${paidDegrees}deg 360deg)`,
            boxShadow: '0 24px 64px rgba(15, 23, 42, 0.12)',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '220px',
              height: '220px',
              borderRadius: '9999px',
              background: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 64,
                fontWeight: 800,
              }}
            >
              {paidPercentage}%
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                color: '#475569',
              }}
            >
              paid
            </div>
          </div>
        </div>
      </div>
    ),
    CHART_IMAGE_SIZE
  );

  return imageResponseToBuffer(image);
}

export async function renderDefaultersChartPng(
  summary: PropertyTaxSummary
): Promise<Buffer | null> {
  if (summary.defaulters.length === 0) {
    return null;
  }

  const maxAmount = Math.max(...summary.defaulters.map((item) => item.amount), 1);

  const image = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'sans-serif',
          padding: '44px 48px',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 52,
              fontWeight: 800,
            }}
          >
            Top Defaulters
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              color: '#475569',
            }}
          >
            Highest outstanding accounts ranked by total due amount.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            marginTop: '10px',
          }}
        >
          {summary.defaulters.map((item, index) => {
            const width = `${Math.max((item.amount / maxAmount) * 100, 8)}%`;

            return (
              <div
                key={`${item.name}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: '210px',
                    fontSize: 28,
                    fontWeight: 600,
                  }}
                >
                  {truncate(item.name, 18)}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flex: 1,
                    height: '38px',
                    background: '#dbeafe',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      width,
                      background: '#2563eb',
                      borderRadius: '9999px',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    width: '180px',
                    justifyContent: 'flex-end',
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  Rs. {formatNumber(item.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),
    CHART_IMAGE_SIZE
  );

  return imageResponseToBuffer(image);
}

function buildLegendRow(
  color: string,
  label: string,
  value: string,
  percentage: string
) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 20px',
        borderRadius: '18px',
        background: '#ffffff',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '18px',
            height: '18px',
            borderRadius: '9999px',
            background: color,
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {label}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: '#475569',
            }}
          >
            {value}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: 28,
          fontWeight: 800,
        }}
      >
        {percentage}
      </div>
    </div>
  );
}

async function imageResponseToBuffer(response: ImageResponse): Promise<Buffer> {
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value);
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}
