import React, { useEffect, useState } from 'react';
import _ from 'lodash';

import { TemplateSrv } from 'app/features/templating/template_srv';
import { SelectableValue } from '@grafana/data';
import StackdriverDatasource from '../datasource';
import { Segment } from '@grafana/ui';
import { MetricDescriptor } from '../types';

export interface Props {
  onChange: (metricDescriptor: MetricDescriptor) => void;
  templateSrv: TemplateSrv;
  templateVariableOptions: Array<SelectableValue<string>>;
  datasource: StackdriverDatasource;
  project: string;
  metricType: string;
  children?: (renderProps: any) => JSX.Element;
}

interface State {
  metricDescriptors: MetricDescriptor[];
  metrics: any[];
  services: any[];
  service: string;
  metric: string;
  metricDescriptor: MetricDescriptor;
  project: string;
}

export function Metrics(props: Props) {
  const [state, setState] = useState<State>({
    metricDescriptors: [],
    metrics: [],
    services: [],
    service: '',
    metric: '',
    metricDescriptor: null,
    project: null,
  });

  const { services, service, metrics } = state;
  const { metricType, templateVariableOptions, project } = props;

  const loadMetricDescriptors = async () => {
    if (project) {
      const metricDescriptors = await props.datasource.getMetricTypes(props.project);
      const services = getServicesList(metricDescriptors);
      const metrics = getMetricsList(metricDescriptors);
      const service = metrics.length > 0 ? metrics[0].service : '';
      const metricDescriptor = getSelectedMetricDescriptor(metricDescriptors, props.metricType);
      setState({ ...state, metricDescriptors, services, metrics, service: service, metricDescriptor });
    }
  };

  useEffect(() => {
    loadMetricDescriptors();
  }, [project]);

  const getSelectedMetricDescriptor = (metricDescriptors: MetricDescriptor[], metricType: string) => {
    return metricDescriptors.find(md => md.type === props.templateSrv.replace(metricType));
  };

  const getMetricsList = (metricDescriptors: MetricDescriptor[]) => {
    const selectedMetricDescriptor = getSelectedMetricDescriptor(metricDescriptors, props.metricType);
    if (!selectedMetricDescriptor) {
      return [];
    }
    const metricsByService = metricDescriptors
      .filter(m => m.service === selectedMetricDescriptor.service)
      .map(m => ({
        service: m.service,
        value: m.type,
        label: m.displayName,
        description: m.description,
      }));
    return metricsByService;
  };

  const onServiceChange = ({ value: service }: any) => {
    const { metricDescriptors } = state;
    const { metricType, templateSrv } = props;

    const metrics = metricDescriptors
      .filter(m => m.service === templateSrv.replace(service))
      .map(m => ({
        service: m.service,
        value: m.type,
        label: m.displayName,
        description: m.description,
      }));

    setState({ ...state, service, metrics });

    if (metrics.length > 0 && !metrics.some(m => m.value === templateSrv.replace(metricType))) {
      onMetricTypeChange(metrics[0]);
    }
  };

  const onMetricTypeChange = ({ value }: any) => {
    const metricDescriptor = getSelectedMetricDescriptor(state.metricDescriptors, value);
    setState({ ...state, metricDescriptor });
    props.onChange({ ...metricDescriptor, type: value });
  };

  const getServicesList = (metricDescriptors: MetricDescriptor[]) => {
    const services = metricDescriptors.map(m => ({
      value: m.service,
      label: _.startCase(m.serviceShortName),
    }));

    return services.length > 0 ? _.uniqBy(services, s => s.value) : [];
  };

  return (
    <>
      <div className="gf-form-inline">
        <span className="gf-form-label width-9 query-keyword">Service</span>
        <Segment
          onChange={onServiceChange}
          value={[...services, ...templateVariableOptions].find(s => s.value === service)}
          options={[
            {
              label: 'Template Variables',
              options: templateVariableOptions,
            },
            ...services,
          ]}
          placeholder="Select Services"
        ></Segment>
        <div className="gf-form gf-form--grow">
          <div className="gf-form-label gf-form-label--grow" />
        </div>
      </div>
      <div className="gf-form-inline">
        <span className="gf-form-label width-9 query-keyword">Metric</span>

        <Segment
          className="query-part"
          onChange={onMetricTypeChange}
          value={[...metrics, ...templateVariableOptions].find(s => s.value === metricType)}
          options={[
            {
              label: 'Template Variables',
              options: templateVariableOptions,
            },
            ...metrics,
          ]}
          placeholder="Select Metric"
        ></Segment>
        <div className="gf-form gf-form--grow">
          <div className="gf-form-label gf-form-label--grow" />
        </div>
      </div>
      {props.children(state.metricDescriptor)}
    </>
  );
}
