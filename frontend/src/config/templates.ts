export interface TemplateConfig {
  template_id: string;
  display_name: string;
  task_type: "regression" | "classification";
  business_question: string;
  target: string;
  key_inputs: string[];
  model_type: string;
  key_output: string;
  goal_example: string;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    template_id: "yield_optimizer",
    display_name: "Manufacturing Yield Optimizer",
    task_type: "regression",
    business_question: "What settings maximize yield above X%?",
    target: "Yield (%)",
    key_inputs: ["Temperature", "Pressure", "Humidity", "Speed"],
    model_type: "Random Forest Regression + grid-search",
    key_output: "Recommended operating range, expected yield, ROI",
    goal_example:
      "Maximize yield above 95% while keeping temperature below 90°C",
  },
  {
    template_id: "defect_risk",
    display_name: "Defect / Quality Risk Predictor",
    task_type: "classification",
    business_question: "Which batches are likely to fail QC?",
    target: "Defect (yes/no) / Quality Score",
    key_inputs: ["Process params", "Machine ID", "Shift", "Operator", "Batch"],
    model_type: "Logistic Regression / RF Classifier",
    key_output: "Defect probability, top contributing factors",
    goal_example: "Predict which batches will fail quality check",
  },
  {
    template_id: "predictive_maintenance",
    display_name: "Predictive Maintenance",
    task_type: "classification",
    business_question: "Which machine is likely to fail soon?",
    target: "Failure within N days (yes/no)",
    key_inputs: ["Vibration", "Temperature", "Runtime hours", "Maintenance history"],
    model_type: "Gradient Boosting Classifier",
    key_output: "Risk score, recommended maintenance window",
    goal_example: "Predict machine failure in the next 7 days",
  },
  {
    template_id: "sales_forecasting",
    display_name: "Sales Forecasting",
    task_type: "regression",
    business_question: "What will next month's revenue look like?",
    target: "Revenue / Units sold",
    key_inputs: ["Historical sales", "Seasonality", "Promotions", "Pipeline stage"],
    model_type: "Regression with lag features",
    key_output: "Forecast with confidence band, gap-to-target",
    goal_example: "Forecast revenue for next month",
  },
  {
    template_id: "churn_predictor",
    display_name: "Customer Churn Predictor",
    task_type: "classification",
    business_question: "Which customers are likely to leave?",
    target: "Churn (yes/no)",
    key_inputs: ["Usage frequency", "Support tickets", "Tenure", "Payment history"],
    model_type: "Logistic Regression / RF Classifier",
    key_output: "Churn risk score, retention drivers, action list",
    goal_example: "Predict which customers will churn this quarter",
  },
  {
    template_id: "stockout_predictor",
    display_name: "Inventory Stockout Predictor",
    task_type: "regression",
    business_question: "Which SKUs will run out this week?",
    target: "Days until stockout",
    key_inputs: ["Sales velocity", "Current stock", "Lead time", "Seasonality"],
    model_type: "Regression + threshold rules",
    key_output: "Reorder alerts (qty + deadline), lost-sales risk",
    goal_example: "Predict which SKUs stock out this week",
  },
  {
    template_id: "demand_forecasting",
    display_name: "Demand Forecasting",
    task_type: "regression",
    business_question: "How much should we produce/stock next period?",
    target: "Demand quantity",
    key_inputs: ["Historical demand", "Price", "Promotions", "External factors"],
    model_type: "RF / Gradient Boosting Regression",
    key_output: "Demand forecast by SKU/region, confidence interval",
    goal_example: "Forecast demand for next quarter",
  },
  {
    template_id: "energy_optimization",
    display_name: "Energy / Cost Optimization",
    task_type: "regression",
    business_question: "How do we cut energy cost while maintaining output?",
    target: "Energy consumption / Cost",
    key_inputs: ["Machine load", "Ambient temp", "Shift patterns", "Production volume"],
    model_type: "Regression + optimization",
    key_output: "Recommended settings, projected savings",
    goal_example: "Minimize energy cost while keeping output above 90%",
  },
  {
    template_id: "credit_risk",
    display_name: "Credit Risk / Fraud Detection",
    task_type: "classification",
    business_question: "Which transactions/applicants are high risk?",
    target: "Default/Fraud (yes/no)",
    key_inputs: ["Transaction amount", "Frequency", "Account age", "Behavior history"],
    model_type: "Logistic Regression / RF Classifier (imbalance-aware)",
    key_output: "Risk score, flagged items, key risk factors",
    goal_example: "Flag high-risk fraudulent transactions",
  },
  {
    template_id: "attrition_predictor",
    display_name: "Employee Attrition Predictor",
    task_type: "classification",
    business_question: "Which employees are at risk of leaving?",
    target: "Attrition (yes/no)",
    key_inputs: ["Tenure", "Performance rating", "Salary band", "Engagement scores"],
    model_type: "Logistic Regression / RF Classifier",
    key_output: "Attrition risk score, top factors, retention actions",
    goal_example: "Predict which employees will resign this year",
  },
];

export const DEFAULT_TEMPLATE = TEMPLATES[0];

export function getTemplate(id: string): TemplateConfig {
  return TEMPLATES.find((t) => t.template_id === id) || DEFAULT_TEMPLATE;
}

export const BRANDING = {
  appName: "Modliq Studio",
  copilot: "Process Optimization Copilot",
  role: "Process Optimization Engineer",
};
