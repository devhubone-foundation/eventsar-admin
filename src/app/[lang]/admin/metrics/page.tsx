"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useI18n } from "@/components/i18n-provider";
import { useMetaEnums } from "@/lib/meta/use-meta";
import { qk } from "@/lib/api/keys";
import { listEvents } from "@/lib/api/events";
import { listEventExperiences } from "@/lib/api/experiences";
import { getEventMetrics, type EventMetricRow, type MetricType } from "@/lib/api/metrics";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type EventOption = {
  id: string;
  slug: string;
};

type ExperienceOption = {
  slug: string;
};

type TypeFilter = "ALL" | MetricType;

type ChartPoint = {
  day: string;
  EVENT_OPEN: number;
  EXPERIENCE_OPEN: number;
  CAPTURE: number;
};

const METRIC_TYPES: MetricType[] = ["EVENT_OPEN", "EXPERIENCE_OPEN", "CAPTURE"];

const TYPE_COLORS: Record<MetricType, string> = {
  EVENT_OPEN: "var(--color-chart-1)",
  EXPERIENCE_OPEN: "var(--color-chart-2)",
  CAPTURE: "var(--color-chart-3)",
};

const EVENT_NONE = "__NONE__";
const TYPE_ALL = "ALL";
const EXPERIENCE_ALL = "__ALL__";

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const now = new Date();
  const from = new Date(now);
  from.setUTCDate(now.getUTCDate() - 6);
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(now),
  };
}

function toUtcIsoAtMidnight(dateInput: string) {
  return `${dateInput}T00:00:00.000Z`;
}

function dayUtc(dayIso: string) {
  return dayIso.slice(0, 10);
}

function toNumber(input: unknown) {
  return typeof input === "number" && Number.isFinite(input) ? input : 0;
}

function getMetricTypeOptions(metaTypes: string[] | undefined): MetricType[] {
  if (!metaTypes?.length) return METRIC_TYPES;

  const valid = metaTypes.filter((x): x is MetricType => METRIC_TYPES.includes(x as MetricType));
  return valid.length ? valid : METRIC_TYPES;
}

function buildCsv(rows: EventMetricRow[]) {
  const header = ["day_utc", "type", "count", "experience_slug"];

  const esc = (v: string | number) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
      return `"${s.replace(/"/g, "\"\"")}"`;
    }
    return s;
  };

  const lines = rows.map((row) =>
    [dayUtc(row.day), row.type, toNumber(row.count), row.experience?.slug ?? ""].map(esc).join(",")
  );

  return [header.join(","), ...lines].join("\n");
}

export default function MetricsPage() {
  const { t } = useI18n();
  const range = useMemo(() => defaultRange(), []);

  const [eventId, setEventId] = useState(EVENT_NONE);
  const [fromDate, setFromDate] = useState(range.from);
  const [toDate, setToDate] = useState(range.to);
  const [type, setType] = useState<TypeFilter>(TYPE_ALL);
  const [experienceSlug, setExperienceSlug] = useState(EXPERIENCE_ALL);

  const { enums } = useMetaEnums();
  const metricTypeOptions = useMemo(
    () => getMetricTypeOptions(enums["Metric_Type"]),
    [enums]
  );

  const eventsQuery = useQuery({
    queryKey: qk.events({ page: 1, pageSize: 200, sortBy: "created_at", sortDir: "desc" }),
    queryFn: () => listEvents({ page: 1, pageSize: 200, sortBy: "created_at", sortDir: "desc" }),
  });

  const events = useMemo<EventOption[]>(() => {
    const items = eventsQuery.data?.items ?? [];
    return items
      .map((item) => {
        const id = item?.event_id ?? item?.id;
        const slug = item?.slug;
        if (id === undefined || id === null || typeof slug !== "string") return null;
        return { id: String(id), slug };
      })
      .filter((x): x is EventOption => Boolean(x));
  }, [eventsQuery.data?.items]);

  const selectedEventId = eventId === EVENT_NONE ? "" : eventId;

  const experiencesQuery = useQuery({
    queryKey: qk.experiences(selectedEventId || EVENT_NONE, { page: 1, pageSize: 300, sortBy: "slug", sortDir: "asc" }),
    queryFn: () =>
      listEventExperiences(selectedEventId, {
        page: 1,
        pageSize: 300,
        sortBy: "slug",
        sortDir: "asc",
      }),
    enabled: Boolean(selectedEventId),
  });

  const experiences = useMemo<ExperienceOption[]>(() => {
    const items = experiencesQuery.data?.items ?? [];
    return items
      .map((item) => {
        const slug = item?.slug;
        if (typeof slug !== "string") return null;
        return { slug };
      })
      .filter((x): x is ExperienceOption => Boolean(x));
  }, [experiencesQuery.data?.items]);

  const validRange = Boolean(fromDate && toDate && fromDate <= toDate);

  const queryParams = useMemo(
    () => ({
      from: toUtcIsoAtMidnight(fromDate),
      to: toUtcIsoAtMidnight(toDate),
      type: type === TYPE_ALL ? undefined : type,
      experienceSlug: experienceSlug === EXPERIENCE_ALL ? undefined : experienceSlug,
    }),
    [fromDate, toDate, type, experienceSlug]
  );

  const metricsQuery = useQuery({
    queryKey: qk.metrics(selectedEventId || EVENT_NONE, queryParams),
    queryFn: () => getEventMetrics(selectedEventId, queryParams),
    enabled: Boolean(selectedEventId && validRange),
    placeholderData: keepPreviousData,
  });

  const rows = useMemo(() => metricsQuery.data ?? [], [metricsQuery.data]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const byDay = new Map<string, ChartPoint>();
    for (const row of rows) {
      const d = dayUtc(row.day);
      const current = byDay.get(d) ?? {
        day: d,
        EVENT_OPEN: 0,
        EXPERIENCE_OPEN: 0,
        CAPTURE: 0,
      };
      current[row.type] += toNumber(row.count);
      byDay.set(d, current);
    }
    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [rows]);

  const totalInRange = useMemo(
    () => rows.reduce((sum, row) => sum + toNumber(row.count), 0),
    [rows]
  );

  const peak = useMemo(() => {
    if (!chartData.length) return { day: "", value: 0 };

    let peakDay = chartData[0].day;
    let peakValue =
      chartData[0].EVENT_OPEN + chartData[0].EXPERIENCE_OPEN + chartData[0].CAPTURE;

    for (const item of chartData) {
      const value = item.EVENT_OPEN + item.EXPERIENCE_OPEN + item.CAPTURE;
      if (value > peakValue) {
        peakDay = item.day;
        peakValue = value;
      }
    }

    return { day: peakDay, value: peakValue };
  }, [chartData]);

  const seriesToRender = useMemo<MetricType[]>(() => {
    if (type !== TYPE_ALL) return [type];
    const present = new Set<MetricType>();
    for (const row of rows) present.add(row.type);
    return present.size ? [...present] : metricTypeOptions;
  }, [type, rows, metricTypeOptions]);

  const showTypeColumn = type === TYPE_ALL;

  function setQuickRange(days: number) {
    const now = new Date();
    const from = new Date(now);
    from.setUTCDate(now.getUTCDate() - (days - 1));
    setFromDate(toDateInputValue(from));
    setToDate(toDateInputValue(now));
  }

  function onExportCsv() {
    if (!rows.length) return;

    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `metrics-${selectedEventId}-${fromDate}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{t("metrics.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("metrics.utcHint")}</p>
      </div>

      <Card className="gap-4">
        <CardHeader className="pb-0">
          <CardTitle>{t("metrics.filters")}</CardTitle>
          <CardDescription>{t("metrics.filtersHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1 lg:col-span-2">
              <Label>{t("metrics.event")}</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("metrics.selectEvent")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EVENT_NONE}>{t("metrics.selectEvent")}</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.slug} (#{event.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{t("metrics.from")}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>{t("metrics.to")}</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>{t("metrics.type")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as TypeFilter)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TYPE_ALL}>{t("common.all")}</SelectItem>
                  {metricTypeOptions.map((mt) => (
                    <SelectItem key={mt} value={mt}>
                      {mt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <Label>{t("metrics.experienceSlug")}</Label>
              <Select value={experienceSlug} onValueChange={setExperienceSlug} disabled={!selectedEventId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EXPERIENCE_ALL}>{t("common.all")}</SelectItem>
                  {experiences.map((exp) => (
                    <SelectItem key={exp.slug} value={exp.slug}>
                      {exp.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end justify-end gap-2">
              <Button variant="outline" onClick={() => setQuickRange(7)}>
                {t("metrics.last7d")}
              </Button>
              <Button variant="outline" onClick={() => setQuickRange(30)}>
                {t("metrics.last30d")}
              </Button>
              <Button variant="outline" onClick={() => metricsQuery.refetch()} disabled={!selectedEventId || !validRange}>
                {t("metrics.refresh")}
              </Button>
            </div>
          </div>

          {!validRange && <div className="text-sm text-red-600">{t("metrics.invalidRange")}</div>}
          {eventsQuery.error && <div className="text-sm text-red-600">{t("metrics.eventsLoadFailed")}</div>}
          {metricsQuery.error && <div className="text-sm text-red-600">{t("metrics.loadFailed")}</div>}
        </CardContent>
      </Card>

      {!selectedEventId ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">{t("metrics.selectEvent")}</CardContent>
        </Card>
      ) : metricsQuery.isLoading && !metricsQuery.data ? (
        <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">{t("metrics.noDataForRange")}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="gap-2">
              <CardHeader className="pb-0">
                <CardDescription>{t("metrics.totalInRange")}</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{totalInRange.toLocaleString()}</CardContent>
            </Card>

            <Card className="gap-2">
              <CardHeader className="pb-0">
                <CardDescription>{t("metrics.peakDay")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-semibold">{peak.value.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{peak.day} UTC</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("metrics.dailyChart")}</CardTitle>
              <CardDescription>{t("metrics.chartLegendHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    {seriesToRender.map((series) => (
                      <Line
                        key={series}
                        type="monotone"
                        dataKey={series}
                        stroke={TYPE_COLORS[series]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle>{t("metrics.tableTitle")}</CardTitle>
                  <CardDescription>{t("metrics.tableUtcHint")}</CardDescription>
                </div>
                <Button onClick={onExportCsv} variant="outline" disabled={!rows.length}>
                  {t("metrics.exportCsv")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("metrics.dayUtc")}</TableHead>
                    {showTypeColumn && <TableHead>{t("metrics.type")}</TableHead>}
                    <TableHead>{t("metrics.count")}</TableHead>
                    <TableHead>{t("metrics.experience")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...rows]
                    .sort((a, b) => b.day.localeCompare(a.day))
                    .map((row, idx) => (
                      <TableRow key={`${row.day}-${row.type}-${row.experience?.slug ?? "event"}-${idx}`}>
                        <TableCell>{dayUtc(row.day)}</TableCell>
                        {showTypeColumn && <TableCell>{row.type}</TableCell>}
                        <TableCell>{toNumber(row.count).toLocaleString()}</TableCell>
                        <TableCell>{row.experience?.slug ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
